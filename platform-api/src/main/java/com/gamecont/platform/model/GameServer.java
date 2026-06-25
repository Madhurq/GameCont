package com.gamecont.platform.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * Represents a game server managed by the GameCont platform.
 *
 * Each GameServer maps 1:1 to a set of Kubernetes resources:
 * - Deployment (runs the game server container + metrics sidecar)
 * - Service (NodePort — exposes game port to players)
 * - PersistentVolumeClaim (stores world data, survives restarts + scale-to-zero)
 * - ConfigMap (server configuration: server.properties, game mode, etc.)
 *
 * The serverId (e.g., "gs-a1b2c3d4") is used as the K8s resource name prefix.
 *
 * ⚠️ Resource constraints (AWS Free Tier / t3.micro):
 *    Default limits are conservative: 500m CPU, 512Mi memory, 2Gi storage.
 *    These are configurable per-server but capped by the ResourceQuota.
 */
@Entity
@Table(name = "game_servers", indexes = {
    @Index(name = "idx_server_owner", columnList = "owner_id"),
    @Index(name = "idx_server_status", columnList = "status"),
    @Index(name = "idx_server_id_unique", columnList = "server_id", unique = true)
})
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameServer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private String id;

    /** K8s resource name prefix, e.g., "gs-a1b2c3d4". Unique across the cluster. */
    @Column(name = "server_id", nullable = false, unique = true, length = 20)
    private String serverId;

    /** User-friendly display name, e.g., "My Survival World" */
    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private GameType gameType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ServerStatus status;

    @Column(name = "max_players", nullable = false)
    private int maxPlayers;

    /** AWS region or K3s cluster region identifier */
    @Column(length = 20)
    private String region;

    // ── Resource Limits ─────────────────────────────────────
    // These map directly to K8s container resource limits.

    @Column(name = "cpu_limit", length = 10)
    @Builder.Default
    private String cpuLimit = "500m";

    @Column(name = "memory_limit", length = 10)
    @Builder.Default
    private String memoryLimit = "512Mi";

    @Column(name = "storage_gb")
    @Builder.Default
    private int storageGb = 2;

    // ── Network ─────────────────────────────────────────────

    /** Container port for the game protocol (e.g., 25565 for Minecraft) */
    @Column(name = "game_port")
    @Builder.Default
    private int gamePort = 25565;

    /** K8s NodePort assigned to this server's Service (for external access) */
    @Column(name = "node_port")
    private Integer nodePort;

    /** TCP proxy port for wake-on-connect. Players connect here. */
    @Column(name = "proxy_port")
    private Integer proxyPort;

    // ── Ownership ───────────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    // ── Timestamps ──────────────────────────────────────────

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    /** Last time a player was active on this server. Used by IdleServerReaper. */
    @Column(name = "last_active_at")
    private Instant lastActiveAt;
}
