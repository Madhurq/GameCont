package com.gamecont.platform.service;

import com.gamecont.platform.model.GameServer;
import com.gamecont.platform.model.ServerStatus;
import com.gamecont.platform.repository.GameServerRepository;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Wake-on-Connect Proxy — Revives Sleeping Servers
 *
 * When a player tries to join a SLEEPING server, this service:
 * 1. Detects the connection attempt (called from a proxy/controller)
 * 2. Scales the Deployment back to 1 replica
 * 3. Waits for the pod to become ready (~15-30s)
 * 4. Updates the server status to RUNNING
 *
 * The player's client will typically retry the connection, and by the time
 * it retries, the server is ready to accept connections.
 *
 * ⚠️ On t3.micro, wake-up takes ~30-60s due to limited CPU.
 *    Minecraft clients retry connections automatically.
 */
@Service
public class WakeOnConnectProxy {

    private static final Logger log = LoggerFactory.getLogger(WakeOnConnectProxy.class);

    private final GameServerRepository serverRepo;
    private final KubernetesService kubeService;
    private final AuditService auditService;
    private final MeterRegistry meterRegistry;

    public WakeOnConnectProxy(GameServerRepository serverRepo,
                              KubernetesService kubeService,
                              AuditService auditService,
                              MeterRegistry meterRegistry) {
        this.serverRepo = serverRepo;
        this.kubeService = kubeService;
        this.auditService = auditService;
        this.meterRegistry = meterRegistry;
    }

    /**
     * Attempt to wake a sleeping server. Called when a connection attempt is detected.
     *
     * @param serverId the K8s server ID (e.g., "gs-a1b2c3d4")
     * @return true if the server was woken up, false if it wasn't sleeping
     */
    public boolean wakeServer(String serverId) {
        GameServer server = serverRepo.findByServerId(serverId)
                .orElseThrow(() -> new IllegalArgumentException("Server not found: " + serverId));

        if (server.getStatus() != ServerStatus.SLEEPING) {
            log.debug("Server {} is not sleeping (status: {}), no wake needed",
                    serverId, server.getStatus());
            return false;
        }

        log.info("Waking sleeping server: {}", serverId);

        try {
            // Scale Deployment back to 1
            kubeService.scaleDeployment(serverId, 1);

            // Wait for readiness (up to 60s on t3.micro)
            kubeService.waitForReady(serverId, 60);

            // Update database
            server.setStatus(ServerStatus.RUNNING);
            server.setLastActiveAt(Instant.now());
            serverRepo.save(server);

            meterRegistry.counter("gamecont_servers_woken_up").increment();
            auditService.log("SERVER_WOKEN_UP", serverId, server.getOwner().getId(),
                    "Wake-on-connect triggered");

            log.info("Server {} woken up successfully", serverId);
            return true;

        } catch (Exception e) {
            log.error("Failed to wake server {}: {}", serverId, e.getMessage());
            server.setStatus(ServerStatus.ERROR);
            serverRepo.save(server);
            auditService.log("SERVER_WAKE_FAILED", serverId, server.getOwner().getId(),
                    e.getMessage());
            return false;
        }
    }

    /**
     * Update the last-active timestamp for a server.
     * Called periodically when players are connected (prevents idle reaping).
     */
    public void updateLastActive(String serverId) {
        serverRepo.findByServerId(serverId).ifPresent(server -> {
            server.setLastActiveAt(Instant.now());
            serverRepo.save(server);
        });
    }
}
