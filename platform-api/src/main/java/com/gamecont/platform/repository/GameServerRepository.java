package com.gamecont.platform.repository;

import com.gamecont.platform.model.GameServer;
import com.gamecont.platform.model.ServerStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface GameServerRepository extends JpaRepository<GameServer, String> {

    Optional<GameServer> findByServerId(String serverId);

    List<GameServer> findByOwnerId(String ownerId);

    List<GameServer> findByStatus(ServerStatus status);

    List<GameServer> findByOwnerIdAndStatus(String ownerId, ServerStatus status);

    long countByOwnerId(String ownerId);

    /**
     * Find servers that have been idle (no player activity) for longer than
     * the specified cutoff time. Used by the IdleServerReaper for scale-to-zero.
     */
    @Query("SELECT gs FROM GameServer gs WHERE gs.status = :status " +
           "AND gs.lastActiveAt < :cutoff")
    List<GameServer> findIdleServers(
        @Param("status") ServerStatus status,
        @Param("cutoff") Instant cutoff
    );

    /**
     * Find all servers in RUNNING or SLEEPING status for the dashboard overview.
     */
    @Query("SELECT gs FROM GameServer gs WHERE gs.status IN (:statuses) " +
           "ORDER BY gs.createdAt DESC")
    List<GameServer> findByStatusIn(@Param("statuses") List<ServerStatus> statuses);

    boolean existsByServerId(String serverId);
}
