package com.gamecont.platform.dto;

import lombok.*;

/**
 * Response DTO for game server metrics, sourced from the Prometheus sidecar.
 * Frontend uses this to render live charts and gauges on the server detail page.
 */
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServerMetricsResponse {

    private String serverId;

    /** Current number of connected players (-1 if metrics unavailable) */
    private int playersOnline;

    /** Maximum player capacity */
    private int maxPlayers;

    /** Server ticks per second (20 = healthy for Minecraft, <15 = lagging) */
    private double tps;

    /** Memory used by the game server process (bytes) */
    private long memoryUsedBytes;

    /** Maximum memory available to the game server (bytes) */
    private long memoryMaxBytes;

    /** Server uptime in seconds */
    private long uptimeSeconds;

    /** Whether metrics are currently available (sidecar responding) */
    private boolean metricsAvailable;
}
