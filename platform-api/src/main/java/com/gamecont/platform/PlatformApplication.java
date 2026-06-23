package com.gamecont.platform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * GameCont Platform API — Entry Point
 *
 * This is the core backend for the GameCont game server hosting platform.
 * It handles:
 * - REST API for server CRUD operations
 * - Direct Kubernetes API integration via fabric8 to provision game servers
 * - STOMP WebSocket for real-time log streaming
 * - JWT-based authentication
 * - Scheduled tasks (idle server reaper for scale-to-zero)
 * - Async server provisioning (non-blocking K8s resource creation)
 *
 * @see com.gamecont.platform.service.GameServerManager
 * @see com.gamecont.platform.service.IdleServerReaper
 */
@SpringBootApplication
@EnableScheduling   // Enables @Scheduled for IdleServerReaper (checks every 5 min)
@EnableAsync        // Enables @Async for non-blocking server provisioning
public class PlatformApplication {

    public static void main(String[] args) {
        SpringApplication.run(PlatformApplication.class, args);
    }
}
