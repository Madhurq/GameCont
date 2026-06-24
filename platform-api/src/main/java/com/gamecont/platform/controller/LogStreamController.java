package com.gamecont.platform.controller;

import com.gamecont.platform.service.KubernetesService;
import io.fabric8.kubernetes.client.dsl.LogWatch;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * STOMP WebSocket controller for real-time log streaming.
 *
 * Frontend connects via STOMP over WebSocket:
 *   1. Connect to ws://host:8080/ws (via SockJS)
 *   2. Subscribe to /topic/logs/{serverId}
 *   3. Send message to /app/logs/{serverId}/start to begin streaming
 *   4. Send message to /app/logs/{serverId}/stop to stop streaming
 *
 * Internally uses fabric8's watchLog() to tail pod logs in real-time.
 * Each log line is pushed to the STOMP topic as it arrives.
 *
 * ⚠️ On t3.micro, we limit concurrent log streams to avoid memory pressure.
 *    Each LogWatch holds a BufferedReader in memory.
 */
@Controller
public class LogStreamController {

    private static final Logger log = LoggerFactory.getLogger(LogStreamController.class);

    private final KubernetesService kubeService;
    private final SimpMessagingTemplate messagingTemplate;

    // Track active log streams so we can clean them up
    private final Map<String, LogWatch> activeStreams = new ConcurrentHashMap<>();

    public LogStreamController(KubernetesService kubeService,
                                SimpMessagingTemplate messagingTemplate) {
        this.kubeService = kubeService;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Start streaming logs for a game server.
     * Client sends a STOMP message to: /app/logs/{serverId}/start
     * Server pushes log lines to: /topic/logs/{serverId}
     */
    @MessageMapping("/logs/{serverId}/start")
    public void startLogStream(@DestinationVariable String serverId) {
        // Don't start duplicate streams
        if (activeStreams.containsKey(serverId)) {
            log.debug("Log stream already active for server: {}", serverId);
            return;
        }

        log.info("Starting log stream for server: {}", serverId);

        try {
            LogWatch logWatch = kubeService.watchLogs(serverId);
            activeStreams.put(serverId, logWatch);

            // Read log lines in a background thread and push to STOMP topic
            Thread.ofVirtual().name("log-stream-" + serverId).start(() -> {
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(logWatch.getOutput()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        messagingTemplate.convertAndSend(
                                "/topic/logs/" + serverId,
                                Map.of("line", line, "timestamp", System.currentTimeMillis())
                        );
                    }
                } catch (Exception e) {
                    log.debug("Log stream ended for server {}: {}", serverId, e.getMessage());
                } finally {
                    activeStreams.remove(serverId);
                    log.info("Log stream closed for server: {}", serverId);
                }
            });

        } catch (Exception e) {
            log.error("Failed to start log stream for server {}: {}", serverId, e.getMessage());
            messagingTemplate.convertAndSend(
                    "/topic/logs/" + serverId,
                    Map.of("error", "Failed to start log stream: " + e.getMessage())
            );
        }
    }

    /**
     * Stop streaming logs for a game server.
     * Client sends a STOMP message to: /app/logs/{serverId}/stop
     */
    @MessageMapping("/logs/{serverId}/stop")
    public void stopLogStream(@DestinationVariable String serverId) {
        LogWatch logWatch = activeStreams.remove(serverId);
        if (logWatch != null) {
            logWatch.close();
            log.info("Stopped log stream for server: {}", serverId);
        }
    }
}
