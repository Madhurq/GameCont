package com.gamecont.platform.service;

import com.gamecont.platform.config.GameContProperties;
import io.fabric8.kubernetes.api.model.*;
import io.fabric8.kubernetes.api.model.apps.Deployment;
import io.fabric8.kubernetes.api.model.apps.DeploymentBuilder;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.dsl.LogWatch;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Low-level Kubernetes API wrapper using the fabric8 client.
 * Provides methods to create, read, update, and delete K8s resources
 * for game servers.
 *
 * This layer abstracts the fabric8 API for testability — services like
 * GameServerManager call this instead of using KubernetesClient directly.
 *
 * All resources are created in the gamecont-servers namespace.
 */
@Service
public class KubernetesService {

    private static final Logger log = LoggerFactory.getLogger(KubernetesService.class);

    private final KubernetesClient kubeClient;
    private final String namespace;

    public KubernetesService(KubernetesClient kubeClient,
                             GameContProperties properties) {
        this.kubeClient = kubeClient;
        this.namespace = properties.getKubernetes().getNamespace();
    }

    // ═══ Namespace ══════════════════════════════════════════

    /**
     * Ensure the game servers namespace exists. Called on startup.
     */
    public void ensureNamespaceExists() {
        if (kubeClient.namespaces().withName(namespace).get() == null) {
            kubeClient.namespaces().resource(
                new NamespaceBuilder()
                    .withNewMetadata()
                        .withName(namespace)
                        .withLabels(Map.of("app", "gamecont"))
                    .endMetadata()
                    .build()
            ).create();
            log.info("Created namespace: {}", namespace);
        }
    }

    // ═══ PersistentVolumeClaim ══════════════════════════════

    /**
     * Create a PVC for game server world data.
     * PVCs survive pod restarts and scale-to-zero events.
     */
    public void createPvc(String serverId, int storageGb) {
        PersistentVolumeClaim pvc = new PersistentVolumeClaimBuilder()
                .withNewMetadata()
                    .withName(serverId + "-data")
                    .withNamespace(namespace)
                    .withLabels(serverLabels(serverId))
                .endMetadata()
                .withNewSpec()
                    .withAccessModes("ReadWriteOnce")
                    .withNewResources()
                        .addToRequests("storage", new Quantity(storageGb + "Gi"))
                    .endResources()
                .endSpec()
                .build();

        kubeClient.persistentVolumeClaims().inNamespace(namespace).resource(pvc).create();
        log.info("Created PVC: {}-data ({}Gi)", serverId, storageGb);
    }

    // ═══ ConfigMap ══════════════════════════════════════════

    /**
     * Create a ConfigMap with game server configuration.
     */
    public void createConfigMap(String serverId, Map<String, String> serverConfig) {
        ConfigMap configMap = new ConfigMapBuilder()
                .withNewMetadata()
                    .withName(serverId + "-config")
                    .withNamespace(namespace)
                    .withLabels(serverLabels(serverId))
                .endMetadata()
                .withData(serverConfig)
                .build();

        kubeClient.configMaps().inNamespace(namespace).resource(configMap).create();
        log.info("Created ConfigMap: {}-config", serverId);
    }

    // ═══ Deployment ═════════════════════════════════════════

    /**
     * Create a Deployment for a game server with a metrics sidecar.
     *
     * The Deployment contains two containers:
     * 1. game-server — the actual game (e.g., Minecraft)
     * 2. metrics-exporter — Python sidecar that scrapes game stats for Prometheus
     */
    public void createDeployment(String serverId, String image, String ownerId,
                                  String cpuRequest, String cpuLimit,
                                  String memoryRequest, String memoryLimit,
                                  int gamePort) {
        Deployment deployment = new DeploymentBuilder()
                .withNewMetadata()
                    .withName(serverId)
                    .withNamespace(namespace)
                    .withLabels(serverLabels(serverId))
                    .withAnnotations(Map.of(
                        "gamecont.io/owner", ownerId,
                        "gamecont.io/created", java.time.Instant.now().toString(),
                        "gamecont.io/last-active", java.time.Instant.now().toString()
                    ))
                .endMetadata()
                .withNewSpec()
                    .withReplicas(1)
                    .withNewSelector()
                        .addToMatchLabels("server-id", serverId)
                    .endSelector()
                    .withNewTemplate()
                        .withNewMetadata()
                            .addToLabels("server-id", serverId)
                            .addToLabels("app", "gamecont")
                            .addToAnnotations("prometheus.io/scrape", "true")
                            .addToAnnotations("prometheus.io/port", "9090")
                        .endMetadata()
                        .withNewSpec()
                            // ── Game Server Container ──
                            .addNewContainer()
                                .withName("game-server")
                                .withImage(image)
                                .addNewPort()
                                    .withContainerPort(gamePort)
                                    .withName("game")
                                .endPort()
                                .withNewResources()
                                    .addToRequests("cpu", new Quantity(cpuRequest))
                                    .addToRequests("memory", new Quantity(memoryRequest))
                                    .addToLimits("cpu", new Quantity(cpuLimit))
                                    .addToLimits("memory", new Quantity(memoryLimit))
                                .endResources()
                                .addNewVolumeMount()
                                    .withName("server-data")
                                    .withMountPath("/data")
                                .endVolumeMount()
                                .addNewVolumeMount()
                                    .withName("server-config")
                                    .withMountPath("/config")
                                    .withReadOnly(true)
                                .endVolumeMount()
                                .addNewEnv().withName("EULA").withValue("TRUE").endEnv()
                                // Liveness: is the game server process running?
                                .withNewLivenessProbe()
                                    .withNewTcpSocket()
                                        .withNewPort(gamePort)
                                    .endTcpSocket()
                                    .withInitialDelaySeconds(60)
                                    .withPeriodSeconds(10)
                                    .withFailureThreshold(3)
                                .endLivenessProbe()
                                // Readiness: is the server accepting players?
                                .withNewReadinessProbe()
                                    .withNewTcpSocket()
                                        .withNewPort(gamePort)
                                    .endTcpSocket()
                                    .withInitialDelaySeconds(30)
                                    .withPeriodSeconds(5)
                                .endReadinessProbe()
                            .endContainer()
                            // ── Metrics Sidecar Container ──
                            .addNewContainer()
                                .withName("metrics-exporter")
                                .withImage("ghcr.io/gamecont/metrics-exporter:latest")
                                .addNewPort()
                                    .withContainerPort(9090)
                                    .withName("metrics")
                                .endPort()
                                .addNewEnv()
                                    .withName("SERVER_ID").withValue(serverId)
                                .endEnv()
                                .addNewEnv()
                                    .withName("GAME_SERVER_HOST").withValue("localhost")
                                .endEnv()
                                .addNewEnv()
                                    .withName("GAME_QUERY_PORT").withValue(String.valueOf(gamePort))
                                .endEnv()
                                .withNewResources()
                                    .addToRequests("cpu", new Quantity("50m"))
                                    .addToRequests("memory", new Quantity("32Mi"))
                                    .addToLimits("cpu", new Quantity("100m"))
                                    .addToLimits("memory", new Quantity("64Mi"))
                                .endResources()
                            .endContainer()
                            // ── Volumes ──
                            .addNewVolume()
                                .withName("server-data")
                                .withNewPersistentVolumeClaim()
                                    .withClaimName(serverId + "-data")
                                .endPersistentVolumeClaim()
                            .endVolume()
                            .addNewVolume()
                                .withName("server-config")
                                .withNewConfigMap()
                                    .withName(serverId + "-config")
                                .endConfigMap()
                            .endVolume()
                        .endSpec()
                    .endTemplate()
                .endSpec()
                .build();

        kubeClient.apps().deployments().inNamespace(namespace).resource(deployment).create();
        log.info("Created Deployment: {} (image: {})", serverId, image);
    }

    // ═══ Service (NodePort) ═════════════════════════════════

    /**
     * Create a NodePort Service to expose the game server to external players.
     * Returns the assigned NodePort number.
     */
    public int createService(String serverId, int gamePort) {
        io.fabric8.kubernetes.api.model.Service service = new ServiceBuilder()
                .withNewMetadata()
                    .withName(serverId + "-svc")
                    .withNamespace(namespace)
                    .withLabels(serverLabels(serverId))
                .endMetadata()
                .withNewSpec()
                    .withType("NodePort")
                    .withSelector(Map.of("server-id", serverId))
                    .addNewPort()
                        .withPort(gamePort)
                        .withTargetPort(new IntOrString(gamePort))
                        .withName("game")
                    .endPort()
                .endSpec()
                .build();

        io.fabric8.kubernetes.api.model.Service created = kubeClient.services()
                .inNamespace(namespace).resource(service).create();

        int nodePort = created.getSpec().getPorts().get(0).getNodePort();
        log.info("Created Service: {}-svc (NodePort: {})", serverId, nodePort);
        return nodePort;
    }

    // ═══ Scaling ════════════════════════════════════════════

    /**
     * Scale a Deployment to the specified replica count.
     * Used by IdleServerReaper (→0) and WakeOnConnectProxy (→1).
     */
    public void scaleDeployment(String serverId, int replicas) {
        kubeClient.apps().deployments()
                .inNamespace(namespace)
                .withName(serverId)
                .scale(replicas);
        log.info("Scaled Deployment {} to {} replicas", serverId, replicas);
    }

    /**
     * Wait for a Deployment to become ready (all pods running).
     */
    public void waitForReady(String serverId, int timeoutSeconds) {
        try {
            kubeClient.apps().deployments()
                    .inNamespace(namespace)
                    .withName(serverId)
                    .waitUntilReady(timeoutSeconds, TimeUnit.SECONDS);
            log.info("Deployment {} is ready", serverId);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Interrupted while waiting for Deployment {} to be ready", serverId);
        }
    }

    /**
     * Get current replica count of a Deployment.
     */
    public int getReplicaCount(String serverId) {
        Deployment dep = kubeClient.apps().deployments()
                .inNamespace(namespace)
                .withName(serverId)
                .get();
        if (dep == null) return -1;
        Integer replicas = dep.getSpec().getReplicas();
        return replicas != null ? replicas : 0;
    }

    // ═══ Log Streaming ══════════════════════════════════════

    /**
     * Get a log stream for a game server pod's main container.
     * Used by the STOMP WebSocket log streaming feature.
     */
    public InputStream getLogStream(String serverId) {
        return kubeClient.apps().deployments()
                .inNamespace(namespace)
                .withName(serverId)
                .getLog();  // Returns InputStream of current logs
    }

    /**
     * Watch logs in real-time (tailing) for the game-server container.
     */
    public LogWatch watchLogs(String serverId) {
        // Find the pod for this deployment
        var pods = kubeClient.pods()
                .inNamespace(namespace)
                .withLabel("server-id", serverId)
                .list()
                .getItems();

        if (pods.isEmpty()) {
            throw new RuntimeException("No pods found for server: " + serverId);
        }

        String podName = pods.get(0).getMetadata().getName();
        return kubeClient.pods()
                .inNamespace(namespace)
                .withName(podName)
                .inContainer("game-server")
                .tailingLines(100)
                .watchLog();
    }

    // ═══ Deletion ═══════════════════════════════════════════

    /**
     * Delete all K8s resources associated with a game server.
     * Order: Deployment → Service → ConfigMap → PVC
     */
    public void deleteServerResources(String serverId) {
        // Delete Deployment
        kubeClient.apps().deployments()
                .inNamespace(namespace)
                .withName(serverId)
                .delete();

        // Delete Service
        kubeClient.services()
                .inNamespace(namespace)
                .withName(serverId + "-svc")
                .delete();

        // Delete ConfigMap
        kubeClient.configMaps()
                .inNamespace(namespace)
                .withName(serverId + "-config")
                .delete();

        // Delete PVC (world data is gone!)
        kubeClient.persistentVolumeClaims()
                .inNamespace(namespace)
                .withName(serverId + "-data")
                .delete();

        log.info("Deleted all K8s resources for server: {}", serverId);
    }

    // ═══ Helpers ════════════════════════════════════════════

    private Map<String, String> serverLabels(String serverId) {
        return Map.of(
                "app", "gamecont",
                "server-id", serverId,
                "managed-by", "gamecont-platform"
        );
    }

    /**
     * Get the external IP of a K8s node (for building connect addresses).
     * On K3s single-node, this is the EC2 public IP.
     */
    public String getNodeExternalIp() {
        try {
            var nodes = kubeClient.nodes().list().getItems();
            if (nodes.isEmpty()) return null;

            return nodes.get(0).getStatus().getAddresses().stream()
                    .filter(addr -> "ExternalIP".equals(addr.getType()))
                    .map(NodeAddress::getAddress)
                    .findFirst()
                    // Fallback to InternalIP if no ExternalIP
                    .orElseGet(() -> nodes.get(0).getStatus().getAddresses().stream()
                            .filter(addr -> "InternalIP".equals(addr.getType()))
                            .map(NodeAddress::getAddress)
                            .findFirst()
                            .orElse("localhost"));
        } catch (Exception e) {
            log.warn("Could not determine node IP: {}", e.getMessage());
            return "localhost";
        }
    }
}
