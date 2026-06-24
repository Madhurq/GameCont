package com.gamecont.platform.service;

import com.gamecont.platform.config.GameContProperties;
import com.gamecont.platform.dto.ServerMetricsResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import com.gamecont.platform.model.GameServer;
import com.gamecont.platform.repository.GameServerRepository;

import java.util.Map;

/**
 * Queries Prometheus for game server metrics.
 *
 * The metrics sidecar (Python) running alongside each game server pod
 * exports gauges like game_players_online, game_tps, game_memory_used_bytes.
 * This service queries the Prometheus HTTP API to retrieve those values.
 *
 * Uses Spring WebFlux's WebClient for non-blocking HTTP calls.
 */
@Service
public class ServerMetricsService {

    private static final Logger log = LoggerFactory.getLogger(ServerMetricsService.class);

    private final WebClient prometheusClient;
    private final GameServerRepository serverRepo;

    public ServerMetricsService(GameContProperties properties, GameServerRepository serverRepo) {
        this.prometheusClient = WebClient.builder()
                .baseUrl(properties.getPrometheus().getUrl())
                .build();
        this.serverRepo = serverRepo;
    }

    /**
     * Fetch current metrics for a specific game server from Prometheus.
     */
    public ServerMetricsResponse getServerMetrics(String serverId) {
        String k8sServerId = serverRepo.findById(serverId)
                .map(GameServer::getServerId)
                .orElse(serverId);

        try {
            int playersOnline = queryPrometheusGauge("game_players_online", k8sServerId);
            int maxPlayers = queryPrometheusGauge("game_max_players", k8sServerId);
            double tps = queryPrometheusDouble("game_tps", k8sServerId);
            long memoryUsed = queryPrometheusLong("game_memory_used_bytes", k8sServerId);
            long memoryMax = queryPrometheusLong("game_memory_max_bytes", k8sServerId);
            long uptime = queryPrometheusLong("game_uptime_seconds", k8sServerId);

            return ServerMetricsResponse.builder()
                    .serverId(serverId) // Keep returning the requested ID (e.g. DB ID) for frontend query key
                    .playersOnline(playersOnline)
                    .maxPlayers(maxPlayers)
                    .tps(tps)
                    .memoryUsedBytes(memoryUsed)
                    .memoryMaxBytes(memoryMax)
                    .uptimeSeconds(uptime)
                    .metricsAvailable(true)
                    .build();

        } catch (Exception e) {
            log.warn("Failed to fetch metrics for server {}: {}", serverId, e.getMessage());
            return ServerMetricsResponse.builder()
                    .serverId(serverId)
                    .playersOnline(-1)
                    .metricsAvailable(false)
                    .build();
        }
    }

    /**
     * Query Prometheus for a single gauge value.
     * Uses the instant query API: GET /api/v1/query?query=metric{server_id="X"}
     */
    @SuppressWarnings("unchecked")
    private int queryPrometheusGauge(String metricName, String serverId) {
        try {
            Map<String, Object> response = prometheusClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/v1/query")
                            .queryParam("query", metricName + "{server_id=\"" + serverId + "\"}")
                            .build())
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            return extractIntValue(response);
        } catch (Exception e) {
            log.debug("Prometheus query failed for {}: {}", metricName, e.getMessage());
            return -1;
        }
    }

    private double queryPrometheusDouble(String metricName, String serverId) {
        try {
            Map<String, Object> response = prometheusClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/v1/query")
                            .queryParam("query", metricName + "{server_id=\"" + serverId + "\"}")
                            .build())
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            return extractDoubleValue(response);
        } catch (Exception e) {
            return 0.0;
        }
    }

    private long queryPrometheusLong(String metricName, String serverId) {
        try {
            Map<String, Object> response = prometheusClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/v1/query")
                            .queryParam("query", metricName + "{server_id=\"" + serverId + "\"}")
                            .build())
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            return (long) extractDoubleValue(response);
        } catch (Exception e) {
            return 0L;
        }
    }

    /**
     * Extract a numeric value from a Prometheus instant query response.
     * Response format: { "data": { "result": [{ "value": [timestamp, "value"] }] } }
     */
    @SuppressWarnings("unchecked")
    private int extractIntValue(Map<String, Object> response) {
        if (response == null) return -1;
        Map<String, Object> data = (Map<String, Object>) response.get("data");
        if (data == null) return -1;
        var results = (java.util.List<Map<String, Object>>) data.get("result");
        if (results == null || results.isEmpty()) return -1;
        var value = (java.util.List<Object>) results.get(0).get("value");
        if (value == null || value.size() < 2) return -1;
        return (int) Double.parseDouble(value.get(1).toString());
    }

    @SuppressWarnings("unchecked")
    private double extractDoubleValue(Map<String, Object> response) {
        if (response == null) return 0.0;
        Map<String, Object> data = (Map<String, Object>) response.get("data");
        if (data == null) return 0.0;
        var results = (java.util.List<Map<String, Object>>) data.get("result");
        if (results == null || results.isEmpty()) return 0.0;
        var value = (java.util.List<Object>) results.get(0).get("value");
        if (value == null || value.size() < 2) return 0.0;
        return Double.parseDouble(value.get(1).toString());
    }
}
