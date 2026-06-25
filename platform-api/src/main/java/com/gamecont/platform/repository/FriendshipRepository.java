package com.gamecont.platform.repository;

import com.gamecont.platform.model.Friendship;
import com.gamecont.platform.model.FriendshipStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendshipRepository extends JpaRepository<Friendship, String> {

    @Query("SELECT f FROM Friendship f WHERE (f.user.id = :userId AND f.friend.id = :friendId) OR (f.user.id = :friendId AND f.friend.id = :userId)")
    Optional<Friendship> findFriendshipBetween(@Param("userId") String userId, @Param("friendId") String friendId);

    Optional<Friendship> findByUser_IdAndFriend_Id(String userId, String friendId);

    List<Friendship> findByFriend_IdAndStatus(String friendId, FriendshipStatus status);

    List<Friendship> findByUser_IdAndStatus(String userId, FriendshipStatus status);

    @Query("SELECT f FROM Friendship f WHERE f.status = :status AND (f.user.id = :userId OR f.friend.id = :userId)")
    List<Friendship> findFriendshipsByUserIdAndStatus(@Param("userId") String userId, @Param("status") FriendshipStatus status);
}
