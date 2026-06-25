package com.gamecont.platform.service;

import com.gamecont.platform.config.GameContProperties;
import com.gamecont.platform.model.GameServer;
import com.gamecont.platform.model.ServerStatus;
import com.gamecont.platform.repository.GameServerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Periodically queries Prometheus for player activity and updates
 * {@code lastActiveAt} on RUNNING servers that have active players.
 *
 * This prevents the {@link IdleServerReaper} from scaling down servers
 * that still have players online, even if no console activity occurred.
 *
 * Data flow:
 *   Game Server → Metrics Sidecar (:9090) → Prometheus → This tracker → lastActiveAt
 */
@Service
public class PlayerActivityTracker {

    private static final Logger log = LoggerFactory.getLogger(PlayerActivityTracker.class);

    private final GameServerRepository serverRepo;
    private final WebClient prometheusClient;

    public PlayerActivityTracker(GameServerRepository serverRepo,
                                 GameContProperties properties) {
        this.serverRepo = serverRepo;
        this.prometheusClient = WebClient.builder()
                .baseUrl(properties.getPrometheus().getUrl())
                .build();
    }

    /**
     * Runs every 60 seconds. For each RUNNING server, queries Prometheus
     * for the {@code game_players_online} gauge. If the value is &gt; 0,
     * updates the server's {@code lastActiveAt} to now.
     */
    @Scheduled(fixedRate = 60_000)
    public void trackPlayerActivity() {
        List<GameServer> runningServers = serverRepo.findByStatus(ServerStatus.RUNNING);

        for (GameServer server : runningServers) {
            try {
                int playersOnline = queryPlayerCount(server.getServerId());
                if (playersOnline > 0) {
                    server.setLastActiveAt(Instant.now());
                    serverRepo.save(server);
                    log.debug("Updated lastActiveAt for server {} ({} players online)",
                            server.getServerId(), playersOnline);
                }
            } catch (Exception e) {
                log.debug("Failed to query player count for server {}: {}",
                        server.getServerId(), e.getMessage());
            }
        }
    }

    /**
     * Query Prometheus for the current player count of a specific server.
     */
    @SuppressWarnings("unchecked")
    private int queryPlayerCount(String k8sServerId) {
        try {
            Map<String, Object> response = prometheusClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/v1/query")
                            .queryParam("query",
                                    "game_players_online{server_id=\"" + k8sServerId + "\"}")
                            .build())
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response == null) return -1;
            Map<String, Object> data = (Map<String, Object>) response.get("data");
            if (data == null) return -1;
            var results = (List<Map<String, Object>>) data.get("result");
            if (results == null || results.isEmpty()) return -1;
            var value = (List<Object>) results.get(0).get("value");
            if (value == null || value.size() < 2) return -1;
            return (int) Double.parseDouble(value.get(1).toString());
        } catch (Exception e) {
            log.debug("Prometheus player count query failed for {}: {}",
                    k8sServerId, e.getMessage());
            return -1;
        }
    }
}
