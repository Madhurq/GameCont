package com.gamecont.platform.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Audit trail for platform actions. Records every significant event
 * for debugging and compliance.
 *
 * Example entries:
 * - "SERVER_CREATED"  — User created a new game server
 * - "SERVER_DELETED"  — User deleted a server
 * - "SERVER_SCALED_TO_ZERO" — IdleServerReaper scaled down an idle server
 * - "SERVER_WOKEN_UP" — WakeOnConnectProxy scaled a server back to 1
 * - "USER_REGISTERED" — New user registered
 */
@Entity
@Table(name = "audit_logs", indexes = {
    @Index(name = "idx_audit_server", columnList = "server_id"),
    @Index(name = "idx_audit_user", columnList = "user_id"),
    @Index(name = "idx_audit_action", columnList = "action"),
    @Index(name = "idx_audit_timestamp", columnList = "created_at")
})
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private String id;

    /** The action that occurred (e.g., "SERVER_CREATED", "SERVER_SCALED_TO_ZERO") */
    @Column(nullable = false, length = 50)
    private String action;

    /** The game server this action relates to (nullable for user-only events) */
    @Column(name = "server_id", length = 20)
    private String serverId;

    /** The user who triggered or owns the related resource */
    @Column(name = "user_id")
    private String userId;

    /** JSON or free-text details about the event */
    @Column(columnDefinition = "TEXT")
    private String details;

    /** Source IP or system identifier */
    @Column(length = 50)
    private String source;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
