package com.gamecont.platform.controller;

import com.gamecont.platform.dto.CreateServerRequest;
import com.gamecont.platform.dto.ServerResponse;
import com.gamecont.platform.model.User;
import com.gamecont.platform.service.GameServerManager;
import com.gamecont.platform.service.WakeOnConnectProxy;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Game Server CRUD + Lifecycle Controller.
 *
 * All endpoints require JWT authentication. The authenticated user
 * is injected via @AuthenticationPrincipal — the JwtAuthenticationFilter
 * stores the User entity as the principal in the security context.
 *
 * Endpoints:
 *   POST   /api/servers              → Create a new game server
 *   GET    /api/servers              → List all servers owned by the user
 *   GET    /api/servers/{id}         → Get server details
 *   DELETE /api/servers/{id}         → Delete a server (destroys K8s resources + data)
 *   POST   /api/servers/{id}/start   → Start a stopped/sleeping server
 *   POST   /api/servers/{id}/stop    → Stop a running server
 *   POST   /api/servers/{id}/restart → Restart a running server
 *   POST   /api/servers/{id}/wake    → Wake a sleeping server (wake-on-connect)
 */
@RestController
@RequestMapping("/api/servers")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Game Servers", description = "CRUD and lifecycle management for game servers")
public class GameServerController {

    private final GameServerManager serverManager;
    private final WakeOnConnectProxy wakeProxy;

    public GameServerController(GameServerManager serverManager,
                                WakeOnConnectProxy wakeProxy) {
        this.serverManager = serverManager;
        this.wakeProxy = wakeProxy;
    }

    @PostMapping
    @Operation(summary = "Create a new game server",
               description = "Provisions K8s Deployment + Service + PVC + ConfigMap asynchronously. "
                           + "Returns immediately with status=STARTING.")
    public ResponseEntity<ServerResponse> createServer(
            @Valid @RequestBody CreateServerRequest request,
            @AuthenticationPrincipal User owner) {
        ServerResponse response = serverManager.createServer(request, owner);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "List all servers owned by the authenticated user")
    public ResponseEntity<List<ServerResponse>> listServers(
            @AuthenticationPrincipal User owner) {
        List<ServerResponse> servers = serverManager.getUserServers(owner);
        return ResponseEntity.ok(servers);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a specific server by its DB ID")
    public ResponseEntity<ServerResponse> getServer(
            @PathVariable("id") String serverId,
            @AuthenticationPrincipal User owner) {
        ServerResponse response = serverManager.getServer(serverId, owner);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a server and all its K8s resources",
               description = "⚠️ This destroys the Deployment, Service, ConfigMap, AND PVC (world data is gone).")
    public ResponseEntity<Void> deleteServer(
            @PathVariable("id") String serverId,
            @AuthenticationPrincipal User owner) {
        serverManager.deleteServer(serverId, owner);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/start")
    @Operation(summary = "Start a stopped or sleeping server",
               description = "Scales the K8s Deployment to 1 replica.")
    public ResponseEntity<ServerResponse> startServer(
            @PathVariable("id") String serverId,
            @AuthenticationPrincipal User owner) {
        ServerResponse response = serverManager.startServer(serverId, owner);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/stop")
    @Operation(summary = "Stop a running server",
               description = "Scales the K8s Deployment to 0 replicas. PVC data is preserved.")
    public ResponseEntity<ServerResponse> stopServer(
            @PathVariable("id") String serverId,
            @AuthenticationPrincipal User owner) {
        ServerResponse response = serverManager.stopServer(serverId, owner);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/restart")
    @Operation(summary = "Restart a running server")
    public ResponseEntity<ServerResponse> restartServer(
            @PathVariable("id") String serverId,
            @AuthenticationPrincipal User owner) {
        ServerResponse response = serverManager.restartServer(serverId, owner);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/wake")
    @Operation(summary = "Wake a sleeping server (wake-on-connect)",
               description = "Triggered by a TCP proxy when a player tries to join a sleeping server. "
                           + "Scales to 1 replica and waits for readiness (~30-60s on t3.micro).")
    public ResponseEntity<Void> wakeServer(@PathVariable("id") String serverId) {
        boolean woken = wakeProxy.wakeServer(serverId);
        if (woken) {
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.status(HttpStatus.NOT_MODIFIED).build();
    }
}
