package com.gamecont.platform.service;

import com.gamecont.platform.config.GameContProperties;
import com.gamecont.platform.model.GameServer;
import com.gamecont.platform.model.ServerStatus;
import com.gamecont.platform.repository.GameServerRepository;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Idle Server Reaper — Scale-to-Zero System
 *
 * Runs every 5 minutes and checks for game servers with no player activity.
 * If a RUNNING server has been idle for longer than the configured timeout
 * (default: 10 minutes), it is scaled to 0 replicas.
 *
 * Key behaviors:
 * - PVC (world data) is preserved — only the pod is terminated
 * - Server status changes to SLEEPING (distinguishable from user-initiated STOPPED)
 * - WakeOnConnectProxy will scale it back to 1 when a player tries to join
 *
 * This reduces idle resource consumption by ~85% on AWS Free Tier.
 *
 * ⚠️ On t3.micro (1 GB RAM), this is critical — idle servers consume RAM
 *    even when nobody is playing.
 */
@Service
public class IdleServerReaper {

    private static final Logger log = LoggerFactory.getLogger(IdleServerReaper.class);

    private final GameServerRepository serverRepo;
    private final KubernetesService kubeService;
    private final AuditService auditService;
    private final GameContProperties properties;
    private final MeterRegistry meterRegistry;

    public IdleServerReaper(GameServerRepository serverRepo,
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
     * Scheduled task: check for idle servers every 5 minutes.
     *
     * A server is considered idle if:
     * 1. Its status is RUNNING
     * 2. Its lastActiveAt timestamp is older than the idle timeout
     *
     * In a production setup, we'd also query Prometheus for game_players_online == 0.
     * For the Free Tier MVP, we use the lastActiveAt annotation as a simpler proxy.
     */
    @Scheduled(fixedRate = 300_000) // Every 5 minutes
    public void reapIdleServers() {
        int timeoutMinutes = properties.getServerDefaults().getIdleTimeoutMinutes();
        Instant cutoff = Instant.now().minus(timeoutMinutes, ChronoUnit.MINUTES);

        List<GameServer> idleServers = serverRepo.findIdleServers(ServerStatus.RUNNING, cutoff);

        if (idleServers.isEmpty()) {
            log.debug("No idle servers found");
            return;
        }

        log.info("Found {} idle server(s) to scale to zero", idleServers.size());

        for (GameServer server : idleServers) {
            try {
                scaleToZero(server);
            } catch (Exception e) {
                log.error("Failed to scale server {} to zero: {}",
                        server.getServerId(), e.getMessage());
            }
        }
    }

    private void scaleToZero(GameServer server) {
        String serverId = server.getServerId();
        log.info("Scaling to zero: {} (idle since {})",
                serverId, server.getLastActiveAt());

        // Scale K8s Deployment to 0 replicas (PVC preserved!)
        kubeService.scaleDeployment(serverId, 0);

        // Update database status to SLEEPING
        server.setStatus(ServerStatus.SLEEPING);
        serverRepo.save(server);

        // Metrics + audit
        meterRegistry.counter("gamecont_servers_scaled_to_zero").increment();
        auditService.log("SERVER_SCALED_TO_ZERO", serverId, server.getOwner().getId(),
                "Idle for " + properties.getServerDefaults().getIdleTimeoutMinutes() + " min");

        log.info("Server {} scaled to zero successfully", serverId);
    }
}
