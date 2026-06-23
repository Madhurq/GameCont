package com.gamecont.platform.repository;

import com.gamecont.platform.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, String> {

    List<AuditLog> findByServerIdOrderByCreatedAtDesc(String serverId);

    List<AuditLog> findByUserIdOrderByCreatedAtDesc(String userId);

    Page<AuditLog> findByAction(String action, Pageable pageable);

    List<AuditLog> findByCreatedAtBetween(Instant start, Instant end);
}
