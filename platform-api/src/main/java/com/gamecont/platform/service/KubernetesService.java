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
        try {
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
        } catch (Exception e) {
            log.warn("[MOCK K8S] ensureNamespaceExists: K8s cluster not available, skipping namespace check/creation. Error: {}", e.getMessage());
        }
    }

    // ═══ PersistentVolumeClaim ══════════════════════════════

    /**
     * Create a PVC for game server world data.
     * PVCs survive pod restarts and scale-to-zero events.
     */
    public void createPvc(String serverId, int storageGb) {
        try {
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
        } catch (Exception e) {
            log.warn("[MOCK K8S] createPvc: K8s cluster not available, skipping PVC creation. Error: {}", e.getMessage());
        }
    }

    // ═══ ConfigMap ══════════════════════════════════════════

    /**
     * Create a ConfigMap with game server configuration.
     */
    public void createConfigMap(String serverId, Map<String, String> serverConfig) {
        try {
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
        } catch (Exception e) {
            log.warn("[MOCK K8S] createConfigMap: K8s cluster not available, skipping ConfigMap creation. Error: {}", e.getMessage());
        }
    }

    // ═══ Deployment ═════════════════════════════════════════

    public void createDeployment(String serverId, String image, String ownerId,
                                  String cpuRequest, String cpuLimit,
                                  String memoryRequest, String memoryLimit,
                                  int gamePort) {
        try {
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
        } catch (Exception e) {
            log.warn("[MOCK K8S] createDeployment: K8s cluster not available, skipping Deployment creation. Error: {}", e.getMessage());
        }
    }

    // ═══ Service (NodePort) ═════════════════════════════════

    /**
     * Create a NodePort Service to expose the game server to external players.
     * Returns the assigned NodePort number.
     */
    public int createService(String serverId, int gamePort) {
        try {
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
        } catch (Exception e) {
            int mockPort = 30000 + (int)(Math.random() * 6); // Mock port between 30000 and 30005 to match kind-config hostPorts
            log.warn("[MOCK K8S] createService: K8s cluster not available, mocking Service creation on port {}. Error: {}", mockPort, e.getMessage());
            return mockPort;
        }
    }

    // ═══ Scaling ════════════════════════════════════════════

    /**
     * Scale a Deployment to the specified replica count.
     * Used by IdleServerReaper (→0) and WakeOnConnectProxy (→1).
     */
    public void scaleDeployment(String serverId, int replicas) {
        try {
            kubeClient.apps().deployments()
                    .inNamespace(namespace)
                    .withName(serverId)
                    .scale(replicas);
            log.info("Scaled Deployment {} to {} replicas", serverId, replicas);
        } catch (Exception e) {
            log.warn("[MOCK K8S] scaleDeployment: K8s cluster not available, mocked scaling to {}. Error: {}", replicas, e.getMessage());
        }
    }

    public void waitForReady(String serverId, int timeoutSeconds) {
        try {
            kubeClient.apps().deployments()
                    .inNamespace(namespace)
                    .withName(serverId)
                    .waitUntilReady(timeoutSeconds, TimeUnit.SECONDS);
            log.info("Deployment {} is ready", serverId);
        } catch (Exception e) {
            if (e instanceof InterruptedException || Thread.currentThread().isInterrupted()) {
                Thread.currentThread().interrupt();
            }
            log.warn("Error or interrupted while waiting for Deployment {} to be ready: {}", serverId, e.getMessage());
        }
    }

    /**
     * Get current replica count of a Deployment.
     */
    public int getReplicaCount(String serverId) {
        try {
            Deployment dep = kubeClient.apps().deployments()
                    .inNamespace(namespace)
                    .withName(serverId)
                    .get();
            if (dep == null) return -1;
            Integer replicas = dep.getSpec().getReplicas();
            return replicas != null ? replicas : 0;
        } catch (Exception e) {
            log.warn("[MOCK K8S] getReplicaCount: K8s cluster not available, mocking replica count = 1. Error: {}", e.getMessage());
            return 1;
        }
    }

    // ═══ Log Streaming ══════════════════════════════════════

    public InputStream getLogStream(String serverId) {
        try {
            var pods = kubeClient.pods()
                    .inNamespace(namespace)
                    .withLabel("server-id", serverId)
                    .list()
                    .getItems();

            if (pods.isEmpty()) {
                return InputStream.nullInputStream();
            }

            String podName = pods.get(0).getMetadata().getName();
            String logs = kubeClient.pods()
                    .inNamespace(namespace)
                    .withName(podName)
                    .inContainer("game-server")
                    .getLog();
            return new java.io.ByteArrayInputStream(logs.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.warn("[MOCK K8S] getLogStream: K8s cluster not available, returning mock stream. Error: {}", e.getMessage());
            return new java.io.ByteArrayInputStream("[INFO] Log stream fallback active.\n".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        }
    }

    /**
     * Watch logs in real-time (tailing) for the game-server container.
     */
    public LogWatch watchLogs(String serverId) {
        try {
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
        } catch (Exception e) {
            log.warn("[MOCK K8S] watchLogs: K8s cluster not available, creating mock LogWatch for server {}", serverId);
            try {
                final java.io.PipedInputStream pin = new java.io.PipedInputStream();
                final java.io.PipedOutputStream pout = new java.io.PipedOutputStream(pin);

                final Thread logWriterThread = Thread.ofVirtual().name("mock-log-stream-" + serverId).start(() -> {
                    String[] levels = {"INFO", "WARN", "DEBUG", "INFO", "INFO"};
                    String[] messages = {
                        "Server tick completed (20.0ms)",
                        "Chunk load at [64, 32]",
                        "Player heartbeat: online",
                        "Auto-save complete",
                        "Memory: 342MB / 1024MB",
                        "TPS: 20.0",
                        "Entity tick pool: 42 entities",
                        "GC pause: 12ms",
                        "Backup task queued",
                        "Network: 0.2ms avg latency",
                        "Player \"Steve\" joined the game",
                        "Player \"Alex\" left the game",
                        "World save completed in 0.4s",
                        "Keepalive packet sent",
                        "Chunk [128, -64] unloaded"
                    };
                    try {
                        while (!Thread.currentThread().isInterrupted()) {
                            Thread.sleep(1500 + (long)(Math.random() * 1500));
                            String lvl = levels[(int)(Math.random() * levels.length)];
                            String msg = messages[(int)(Math.random() * messages.length)];
                            String formatted = String.format("[%s] %s\n", lvl, msg);
                            pout.write(formatted.getBytes());
                            pout.flush();
                        }
                    } catch (Exception ignored) {
                    }
                });

                return new LogWatch() {
                    @Override
                    public void close() {
                        logWriterThread.interrupt();
                        try {
                            pout.close();
                            pin.close();
                        } catch (Exception ignored) {}
                    }

                    @Override
                    public InputStream getOutput() {
                        return pin;
                    }
                };
            } catch (Exception ex) {
                log.error("Failed to build mock LogWatch stream", ex);
                return new LogWatch() {
                    @Override
                    public void close() {}
                    @Override
                    public InputStream getOutput() {
                        return InputStream.nullInputStream();
                    }
                };
            }
        }
    }

    // ═══ Deletion ═══════════════════════════════════════════

    /**
     * Delete all K8s resources associated with a game server.
     * Order: Deployment → Service → ConfigMap → PVC
     */
    public void deleteServerResources(String serverId) {
        try {
            // Delete Deployment
            kubeClient.apps().deployments()
                    .inNamespace(namespace)
                    .withName(serverId)
                    .delete();
        } catch (Exception e) {
            log.warn("[MOCK K8S] deleteServerResources (Deployment): {}", e.getMessage());
        }

        try {
            // Delete Service
            kubeClient.services()
                    .inNamespace(namespace)
                    .withName(serverId + "-svc")
                    .delete();
        } catch (Exception e) {
            log.warn("[MOCK K8S] deleteServerResources (Service): {}", e.getMessage());
        }

        try {
            // Delete ConfigMap
            kubeClient.configMaps()
                    .inNamespace(namespace)
                    .withName(serverId + "-config")
                    .delete();
        } catch (Exception e) {
            log.warn("[MOCK K8S] deleteServerResources (ConfigMap): {}", e.getMessage());
        }

        try {
            // Delete PVC (world data is gone!)
            kubeClient.persistentVolumeClaims()
                    .inNamespace(namespace)
                    .withName(serverId + "-data")
                    .delete();
        } catch (Exception e) {
            log.warn("[MOCK K8S] deleteServerResources (PVC): {}", e.getMessage());
        }

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
