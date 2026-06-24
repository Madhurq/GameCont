package com.gamecont.platform.controller;

import com.gamecont.platform.dto.ServerMetricsResponse;
import com.gamecont.platform.service.ServerMetricsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Metrics proxy controller.
 *
 * Proxies game server metrics from Prometheus to the frontend.
 * The Python metrics sidecar (exporter.py) scrapes the game server
 * and exposes gauges on port 9090. Prometheus scrapes those.
 * This controller queries the Prometheus HTTP API.
 *
 * Data flow:
 *   Game Server → Metrics Sidecar (:9090) → Prometheus → This API → Frontend charts
 */
@RestController
@RequestMapping("/api/servers")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Metrics", description = "Live game server metrics from Prometheus")
public class MetricsController {

    private final ServerMetricsService metricsService;

    public MetricsController(ServerMetricsService metricsService) {
        this.metricsService = metricsService;
    }

    @GetMapping("/{serverId}/metrics")
    @Operation(summary = "Get live metrics for a game server",
               description = "Returns player count, TPS, memory usage, and uptime. "
                           + "Data is sourced from Prometheus via the Python metrics sidecar.")
    public ResponseEntity<ServerMetricsResponse> getServerMetrics(
            @PathVariable String serverId) {
        ServerMetricsResponse metrics = metricsService.getServerMetrics(serverId);
        return ResponseEntity.ok(metrics);
    }
}
