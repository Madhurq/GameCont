package com.gamecont.platform.dto;

import com.gamecont.platform.model.GameServer;
import com.gamecont.platform.model.GameType;
import com.gamecont.platform.model.ServerStatus;
import lombok.*;

import java.time.Instant;

/**
 * Response DTO for game server data sent to the frontend.
 * Contains everything the dashboard needs to display a server card.
 */
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServerResponse {

    private String id;
    private String serverId;
    private String name;
    private GameType gameType;
    private ServerStatus status;
    private int maxPlayers;
    private String region;

    // Resource config
    private String cpuLimit;
    private String memoryLimit;
    private int storageGb;

    // Connection info
    private String connectAddress;  // e.g., "54.123.45.67:30001"
    private int gamePort;
    private Integer nodePort;

    // Owner
    private String ownerId;
    private String ownerUsername;

    // Timestamps
    private Instant createdAt;
    private Instant lastActiveAt;

    /**
     * Factory method to convert a GameServer entity to a response DTO.
     *
     * @param server   the JPA entity
     * @param hostIp   the K8s node external IP (for connect address)
     */
    public static ServerResponse fromEntity(GameServer server, String hostIp) {
        String connectAddr = null;
        if (server.getNodePort() != null && hostIp != null) {
            connectAddr = hostIp + ":" + server.getNodePort();
        }

        return ServerResponse.builder()
                .id(server.getId())
                .serverId(server.getServerId())
                .name(server.getName())
                .gameType(server.getGameType())
                .status(server.getStatus())
                .maxPlayers(server.getMaxPlayers())
                .region(server.getRegion())
                .cpuLimit(server.getCpuLimit())
                .memoryLimit(server.getMemoryLimit())
                .storageGb(server.getStorageGb())
                .connectAddress(connectAddr)
                .gamePort(server.getGamePort())
                .nodePort(server.getNodePort())
                .ownerId(server.getOwner().getId())
                .ownerUsername(server.getOwner().getUsername())
                .createdAt(server.getCreatedAt())
                .lastActiveAt(server.getLastActiveAt())
                .build();
    }
}
