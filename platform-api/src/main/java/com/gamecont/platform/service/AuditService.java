package com.gamecont.platform.service;

import com.gamecont.platform.model.AuditLog;
import com.gamecont.platform.repository.AuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Audit trail service. Records all significant platform events asynchronously
 * to avoid blocking the main request thread.
 */
@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    /**
     * Log an audit event. Runs asynchronously to avoid blocking the caller.
     */
    @Async
    public void log(String action, String serverId, String userId, String details) {
        try {
            AuditLog entry = AuditLog.builder()
                    .action(action)
                    .serverId(serverId)
                    .userId(userId)
                    .details(details)
                    .source("platform-api")
                    .build();

            auditLogRepository.save(entry);
            log.debug("Audit: {} | server={} | user={}", action, serverId, userId);
        } catch (Exception e) {
            // Audit logging should never crash the main flow
            log.error("Failed to write audit log: {} — {}", action, e.getMessage());
        }
    }
}
