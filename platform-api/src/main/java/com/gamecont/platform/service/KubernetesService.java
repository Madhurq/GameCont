package com.gamecont.platform.service;

import com.gamecont.platform.config.GameContProperties;
import io.fabric8.kubernetes.api.model.*;
import io.fabric8.kubernetes.api.model.apps.Deployment;
import io.fabric8.kubernetes.api.model.apps.DeploymentBuilder;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.dsl.LogWatch;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.gamecont.platform.model.GameType;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class KubernetesService {

    private static final Logger log = LoggerFactory.getLogger(KubernetesService.class);

    private final KubernetesClient kubeClient;
    private final String namespace;

    @Value("${PLATFORM_PUBLIC_IP:}")
    private String platformPublicIp;

    public KubernetesService(KubernetesClient kubeClient,
                             GameContProperties properties) {
        this.kubeClient = kubeClient;
        this.namespace = properties.getKubernetes().getNamespace();
    }

    // ═══ Namespace ══════════════════════════════════════════

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

    public void createDeployment(String serverId, String image, String ownerId,
                                  String cpuRequest, String cpuLimit,
                                  String memoryRequest, String memoryLimit,
                                  int gamePort, boolean onlineMode,
                                  GameType gameType) {
        String rconPassword = UUID.randomUUID().toString();
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
                        .endMetadata()
                        .withNewSpec()
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
                                .addNewEnv().withName("ONLINE_MODE").withValue(String.valueOf(onlineMode).toUpperCase()).endEnv()
                                .addNewEnv().withName("ENABLE_RCON").withValue("true").endEnv()
                                .addNewEnv().withName("RCON_PASSWORD").withValue(rconPassword).endEnv()
                                .addNewEnv().withName("TYPE").withValue(gameType == GameType.MINECRAFT_MODDED ? "FORGE" : "VANILLA").endEnv()
                                .addNewEnv().withName("VERSION").withValue(gameType == GameType.MINECRAFT_MODDED ? "1.20.4" : "LATEST").endEnv()
                                .addNewEnv().withName("FORGE_VERSION").withValue(gameType == GameType.MINECRAFT_MODDED ? "RECOMMENDED" : "").endEnv()
                                // ponytail: MEMORY omitted — JDK 21 UseContainerSupport auto-detects container RAM
                                .addNewEnv().withName("EXEC_DIRECTLY").withValue("true").endEnv()
                                .withNewLivenessProbe()
                                    .withNewTcpSocket()
                                        .withNewPort(gamePort)
                                    .endTcpSocket()
                                    .withInitialDelaySeconds(300)
                                    .withPeriodSeconds(20)
                                    .withFailureThreshold(5)
                                .endLivenessProbe()
                                .withNewReadinessProbe()
                                    .withNewTcpSocket()
                                        .withNewPort(gamePort)
                                    .endTcpSocket()
                                    .withInitialDelaySeconds(120)
                                    .withPeriodSeconds(10)
                                .endReadinessProbe()
                            .endContainer()
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

    public void scaleDeployment(String serverId, int replicas) {
        kubeClient.apps().deployments()
                .inNamespace(namespace)
                .withName(serverId)
                .scale(replicas);
        log.info("Scaled Deployment {} to {} replicas", serverId, replicas);
    }

    public void waitForReady(String serverId, int timeoutSeconds) {
        kubeClient.apps().deployments()
                .inNamespace(namespace)
                .withName(serverId)
                .waitUntilReady(timeoutSeconds, TimeUnit.SECONDS);
        log.info("Deployment {} is ready", serverId);
    }

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

    public InputStream getLogStream(String serverId) {
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
    }

    public LogWatch watchLogs(String serverId) {
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

    public void deleteServerResources(String serverId) {
        kubeClient.apps().deployments()
                .inNamespace(namespace)
                .withName(serverId)
                .delete();

        kubeClient.services()
                .inNamespace(namespace)
                .withName(serverId + "-svc")
                .delete();

        kubeClient.configMaps()
                .inNamespace(namespace)
                .withName(serverId + "-config")
                .delete();

        kubeClient.persistentVolumeClaims()
                .inNamespace(namespace)
                .withName(serverId + "-data")
                .delete();

        log.info("Deleted all K8s resources for server: {}", serverId);
    }

    // ═══ Exec Commands ═════════════════════════════════════

    public String execCommand(String serverId, String command) {
        var pods = kubeClient.pods()
                .inNamespace(namespace)
                .withLabel("server-id", serverId)
                .list()
                .getItems();

        if (pods.isEmpty()) {
            log.warn("No pods found for server {} to exec command", serverId);
            return "";
        }

        String podName = pods.get(0).getMetadata().getName();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ByteArrayOutputStream err = new ByteArrayOutputStream();

        kubeClient.pods()
                .inNamespace(namespace)
                .withName(podName)
                .inContainer("game-server")
                .writingOutput(out)
                .writingError(err)
                .exec("sh", "-c", command);

        if (err.size() > 0) {
            log.debug("Exec stderr for {}: {}", serverId, err);
        }

        return out.toString(java.nio.charset.StandardCharsets.UTF_8).trim();
    }

    public void execCommandWithInput(String serverId, String command, byte[] input) {
        var pods = kubeClient.pods()
                .inNamespace(namespace)
                .withLabel("server-id", serverId)
                .list()
                .getItems();

        if (pods.isEmpty()) {
            log.warn("No pods found for server {} to exec command with input", serverId);
            return;
        }

        String podName = pods.get(0).getMetadata().getName();

        kubeClient.pods()
                .inNamespace(namespace)
                .withName(podName)
                .inContainer("game-server")
                .readingInput(new java.io.ByteArrayInputStream(input))
                .exec("sh", "-c", command);
    }

    // ═══ Helpers ════════════════════════════════════════════

    private Map<String, String> serverLabels(String serverId) {
        return Map.of(
                "app", "gamecont",
                "server-id", serverId,
                "managed-by", "gamecont-platform"
        );
    }

    @PreDestroy
    public void cleanup() {
        if (kubeClient != null) {
            kubeClient.close();
            log.info("Kubernetes client closed");
        }
    }

    public String getNodeExternalIp() {
        if (platformPublicIp != null && !platformPublicIp.isBlank()) {
            return platformPublicIp;
        }
        var nodes = kubeClient.nodes().list().getItems();
        if (nodes.isEmpty()) return null;

        return nodes.get(0).getStatus().getAddresses().stream()
                .filter(addr -> "ExternalIP".equals(addr.getType()))
                .map(NodeAddress::getAddress)
                .findFirst()
                .orElseGet(() -> nodes.get(0).getStatus().getAddresses().stream()
                        .filter(addr -> "InternalIP".equals(addr.getType()))
                        .map(NodeAddress::getAddress)
                        .findFirst()
                        .orElse("localhost"));
    }
}
