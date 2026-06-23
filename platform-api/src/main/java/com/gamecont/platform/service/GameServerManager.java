package com.gamecont.platform.service;

import com.gamecont.platform.config.GameContProperties;
import com.gamecont.platform.dto.CreateServerRequest;
import com.gamecont.platform.dto.ServerResponse;
import com.gamecont.platform.model.*;
import com.gamecont.platform.repository.GameServerRepository;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Core service for game server lifecycle management.
 *
 * This is where user actions become Kubernetes resources:
 * - "Create Server" → PVC + ConfigMap + Deployment + NodePort Service
 * - "Stop Server" → Scale Deployment to 0
 * - "Start Server" → Scale Deployment to 1
 * - "Delete Server" → Remove all K8s resources + DB record
 *
 * The actual K8s resource creation runs asynchronously via @Async
 * so the REST endpoint returns immediately with status=STARTING.
 */
@Service
public class GameServerManager {

    private static final Logger log = LoggerFactory.getLogger(GameServerManager.class);

    private final GameServerRepository serverRepo;
    private final KubernetesService kubeService;
    private final AuditService auditService;
    private final GameContProperties properties;
    private final MeterRegistry meterRegistry;

    public GameServerManager(GameServerRepository serverRepo,
                             KubernetesService kubeService,
                             AuditService auditService,
                             GameContProperties properties,
                             MeterRegistry meterRegistry) {
        this.serverRepo = serverRepo;
        this.kubeService = kubeService;
        this.auditService = auditService;
        this.properties = properties;
        this.meterRegistry = meterRegistry;
    }

    /**
     * Create a new game server. Returns immediately with status=STARTING.
     * K8s resource creation happens asynchronously.
     */
    @Transactional
    public ServerResponse createServer(CreateServerRequest request, User owner) {
        // Check server limit per user
        long currentCount = serverRepo.countByOwnerId(owner.getId());
        int maxServers = properties.getServerDefaults().getMaxServersPerUser();
        if (currentCount >= maxServers) {
            throw new IllegalStateException(
                    "Server limit reached (" + maxServers + " per user). " +
                    "Delete an existing server or upgrade your plan.");
        }

        // Generate unique server ID
        String serverId = "gs-" + UUID.randomUUID().toString().substring(0, 8);

        // Apply defaults for unset resource limits
        GameContProperties.ServerDefaults defaults = properties.getServerDefaults();
        String cpuLimit = request.getCpuLimit() != null ? request.getCpuLimit() : defaults.getCpuLimit();
        String memoryLimit = request.getMemoryLimit() != null ? request.getMemoryLimit() : defaults.getMemoryLimit();
        int storageGb = request.getStorageGb() != null ? request.getStorageGb() : defaults.getStorageGb();

        // Save to database first (status=STARTING)
        GameServer server = GameServer.builder()
                .serverId(serverId)
                .name(request.getName())
                .gameType(request.getGameType())
                .status(ServerStatus.STARTING)
                .maxPlayers(request.getMaxPlayers())
                .region(request.getRegion() != null ? request.getRegion() : "ap-south-1")
                .cpuLimit(cpuLimit)
                .memoryLimit(memoryLimit)
                .storageGb(storageGb)
                .gamePort(25565) // Default MC port
                .owner(owner)
                .lastActiveAt(Instant.now())
                .build();

        server = serverRepo.save(server);

        // Kick off K8s provisioning asynchronously
        provisionKubernetesResources(server, owner);

        meterRegistry.counter("gamecont_servers_created").increment();
        auditService.log("SERVER_CREATED", serverId, owner.getId(),
                "Game: " + request.getGameType() + ", Name: " + request.getName());

        return ServerResponse.fromEntity(server, kubeService.getNodeExternalIp());
    }

    /**
     * Async K8s resource provisioning. Creates PVC → ConfigMap → Deployment → Service.
     * Updates the DB record with the NodePort and status=RUNNING when done.
     */
    @Async("serverProvisioningExecutor")
    public void provisionKubernetesResources(GameServer server, User owner) {
        String serverId = server.getServerId();
        try {
            log.info("Provisioning K8s resources for server: {}", serverId);

            // 1. Ensure namespace exists
            kubeService.ensureNamespaceExists();

            // 2. Create PVC (world data)
            kubeService.createPvc(serverId, server.getStorageGb());

            // 3. Create ConfigMap (server config)
            Map<String, String> config = buildServerConfig(server);
            kubeService.createConfigMap(serverId, config);

            // 4. Create Deployment (game server + metrics sidecar)
            String image = getImageForGameType(server.getGameType());
            GameContProperties.ServerDefaults defaults = properties.getServerDefaults();
            kubeService.createDeployment(
                    serverId, image, owner.getId(),
                    defaults.getCpuRequest(), server.getCpuLimit(),
                    defaults.getMemoryRequest(), server.getMemoryLimit(),
                    server.getGamePort()
            );

            // 5. Create NodePort Service
            int nodePort = kubeService.createService(serverId, server.getGamePort());

            // 6. Update DB with NodePort and status
            server.setNodePort(nodePort);
            server.setStatus(ServerStatus.RUNNING);
            serverRepo.save(server);

            log.info("Server {} provisioned successfully (NodePort: {})", serverId, nodePort);
            meterRegistry.counter("gamecont_servers_provisioned").increment();

        } catch (Exception e) {
            log.error("Failed to provision server {}: {}", serverId, e.getMessage(), e);
            server.setStatus(ServerStatus.ERROR);
            serverRepo.save(server);
            meterRegistry.counter("gamecont_servers_provision_failed").increment();
            auditService.log("SERVER_PROVISION_FAILED", serverId, owner.getId(), e.getMessage());
        }
    }

    /**
     * Stop a running game server (scale to 0, preserve data).
     */
    @Transactional
    public ServerResponse stopServer(String serverId, User owner) {
        GameServer server = getOwnedServer(serverId, owner);
        validateStatus(server, ServerStatus.RUNNING, ServerStatus.STARTING);

        kubeService.scaleDeployment(serverId, 0);
        server.setStatus(ServerStatus.STOPPED);
        serverRepo.save(server);

        auditService.log("SERVER_STOPPED", serverId, owner.getId(), null);
        return ServerResponse.fromEntity(server, kubeService.getNodeExternalIp());
    }

    /**
     * Start a stopped/sleeping server (scale to 1).
     */
    @Transactional
    public ServerResponse startServer(String serverId, User owner) {
        GameServer server = getOwnedServer(serverId, owner);
        validateStatus(server, ServerStatus.STOPPED, ServerStatus.SLEEPING);

        kubeService.scaleDeployment(serverId, 1);
        server.setStatus(ServerStatus.STARTING);
        server.setLastActiveAt(Instant.now());
        serverRepo.save(server);

        auditService.log("SERVER_STARTED", serverId, owner.getId(), null);
        return ServerResponse.fromEntity(server, kubeService.getNodeExternalIp());
    }

    /**
     * Restart a running server.
     */
    @Transactional
    public ServerResponse restartServer(String serverId, User owner) {
        GameServer server = getOwnedServer(serverId, owner);
        validateStatus(server, ServerStatus.RUNNING);

        // Scale to 0 then back to 1
        kubeService.scaleDeployment(serverId, 0);
        kubeService.scaleDeployment(serverId, 1);
        server.setStatus(ServerStatus.STARTING);
        server.setLastActiveAt(Instant.now());
        serverRepo.save(server);

        auditService.log("SERVER_RESTARTED", serverId, owner.getId(), null);
        return ServerResponse.fromEntity(server, kubeService.getNodeExternalIp());
    }

    /**
     * Delete a game server and all its K8s resources (including PVC/world data).
     */
    @Transactional
    public void deleteServer(String serverId, User owner) {
        GameServer server = getOwnedServer(serverId, owner);

        kubeService.deleteServerResources(serverId);
        serverRepo.delete(server);

        meterRegistry.counter("gamecont_servers_deleted").increment();
        auditService.log("SERVER_DELETED", serverId, owner.getId(), null);
        log.info("Server {} deleted by user {}", serverId, owner.getUsername());
    }

    /**
     * Get all servers owned by a user.
     */
    public List<ServerResponse> getUserServers(User owner) {
        String hostIp = kubeService.getNodeExternalIp();
        return serverRepo.findByOwnerId(owner.getId()).stream()
                .map(s -> ServerResponse.fromEntity(s, hostIp))
                .toList();
    }

    /**
     * Get a single server by ID (owned by the requesting user).
     */
    public ServerResponse getServer(String serverId, User owner) {
        GameServer server = getOwnedServer(serverId, owner);
        return ServerResponse.fromEntity(server, kubeService.getNodeExternalIp());
    }

    // ═══ Helpers ════════════════════════════════════════════

    private GameServer getOwnedServer(String serverId, User owner) {
        GameServer server = serverRepo.findByServerId(serverId)
                .orElseThrow(() -> new IllegalArgumentException("Server not found: " + serverId));

        if (!server.getOwner().getId().equals(owner.getId())) {
            throw new SecurityException("You do not own this server");
        }

        return server;
    }

    private void validateStatus(GameServer server, ServerStatus... allowed) {
        for (ServerStatus s : allowed) {
            if (server.getStatus() == s) return;
        }
        throw new IllegalStateException(
                "Cannot perform this action on a server with status: " + server.getStatus());
    }

    private String getImageForGameType(GameType gameType) {
        return switch (gameType) {
            case MINECRAFT_VANILLA -> "itzg/minecraft-server:latest";
            case MINECRAFT_MODDED -> "itzg/minecraft-server:latest"; // Same image, different ENV
            case CUSTOM -> "ghcr.io/gamecont/custom-server:latest";
        };
    }

    private Map<String, String> buildServerConfig(GameServer server) {
        return Map.of(
                "server-name", server.getName(),
                "max-players", String.valueOf(server.getMaxPlayers()),
                "game-type", server.getGameType().name(),
                "server-id", server.getServerId()
        );
    }
}
