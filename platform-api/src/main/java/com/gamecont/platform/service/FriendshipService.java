package com.gamecont.platform.service;

import com.gamecont.platform.dto.FriendDtos.*;
import com.gamecont.platform.model.Friendship;
import com.gamecont.platform.model.FriendshipStatus;
import com.gamecont.platform.model.User;
import com.gamecont.platform.repository.FriendshipRepository;
import com.gamecont.platform.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class FriendshipService {

    private static final Logger log = LoggerFactory.getLogger(FriendshipService.class);

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public FriendshipService(FriendshipRepository friendshipRepository,
                             UserRepository userRepository,
                             AuditService auditService) {
        this.friendshipRepository = friendshipRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @Transactional
    public FriendshipResponse sendFriendRequest(String currentUserId, String friendUsername) {
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        User friendUser = userRepository.findByUsername(friendUsername)
                .orElseThrow(() -> new IllegalArgumentException("User with username '" + friendUsername + "' not found"));

        if (currentUser.getId().equals(friendUser.getId())) {
            throw new IllegalArgumentException("You cannot add yourself as a friend");
        }

        Optional<Friendship> existingFriendship = friendshipRepository.findFriendshipBetween(currentUser.getId(), friendUser.getId());

        if (existingFriendship.isPresent()) {
            Friendship friendship = existingFriendship.get();
            if (friendship.getStatus() == FriendshipStatus.ACCEPTED) {
                throw new IllegalArgumentException("You are already friends with " + friendUsername);
            } else {
                if (friendship.getUser().getId().equals(currentUser.getId())) {
                    throw new IllegalArgumentException("Friend request already sent to " + friendUsername);
                } else {
                    throw new IllegalArgumentException("You have a pending friend request from " + friendUsername);
                }
            }
        }

        Friendship friendship = Friendship.builder()
                .user(currentUser)
                .friend(friendUser)
                .status(FriendshipStatus.PENDING)
                .build();

        friendship = friendshipRepository.save(friendship);
        log.info("Friend request sent from {} to {}", currentUser.getUsername(), friendUser.getUsername());

        auditService.log("FRIEND_REQUEST_SENT", null, currentUser.getId(),
                "Sent friend request to: " + friendUser.getUsername());

        return mapToResponse(friendship, currentUser.getId());
    }

    @Transactional
    public FriendshipResponse acceptFriendRequest(String currentUserId, String friendshipId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new IllegalArgumentException("Friend request not found"));

        if (!friendship.getFriend().getId().equals(currentUserId)) {
            throw new SecurityException("You can only accept friend requests sent to you");
        }

        if (friendship.getStatus() == FriendshipStatus.ACCEPTED) {
            throw new IllegalArgumentException("Friend request is already accepted");
        }

        friendship.setStatus(FriendshipStatus.ACCEPTED);
        friendship = friendshipRepository.save(friendship);
        log.info("Friend request accepted: {}", friendship.getId());

        auditService.log("FRIEND_REQUEST_ACCEPTED", null, currentUserId,
                "Accepted friend request from: " + friendship.getUser().getUsername());

        return mapToResponse(friendship, currentUserId);
    }

    @Transactional
    public void declineOrCancelRequest(String currentUserId, String friendshipId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new IllegalArgumentException("Friend request not found"));

        if (!friendship.getUser().getId().equals(currentUserId) && !friendship.getFriend().getId().equals(currentUserId)) {
            throw new SecurityException("You are not authorized to cancel or decline this friend request");
        }

        if (friendship.getStatus() != FriendshipStatus.PENDING) {
            throw new IllegalArgumentException("Only pending friend requests can be declined or cancelled");
        }

        friendshipRepository.delete(friendship);
        log.info("Friend request cancelled/declined: {}", friendship.getId());

        if (friendship.getUser().getId().equals(currentUserId)) {
            auditService.log("FRIEND_REQUEST_CANCELLED", null, currentUserId,
                    "Cancelled friend request to: " + friendship.getFriend().getUsername());
        } else {
            auditService.log("FRIEND_REQUEST_DECLINED", null, currentUserId,
                    "Declined friend request from: " + friendship.getUser().getUsername());
        }
    }

    @Transactional
    public void removeFriend(String currentUserId, String friendshipId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new IllegalArgumentException("Friendship not found"));

        if (!friendship.getUser().getId().equals(currentUserId) && !friendship.getFriend().getId().equals(currentUserId)) {
            throw new SecurityException("You are not authorized to remove this friend");
        }

        if (friendship.getStatus() != FriendshipStatus.ACCEPTED) {
            throw new IllegalArgumentException("Friendship is not active");
        }

        friendshipRepository.delete(friendship);
        log.info("Friendship removed: {}", friendship.getId());

        String friendName = friendship.getUser().getId().equals(currentUserId) ?
                friendship.getFriend().getUsername() : friendship.getUser().getUsername();

        auditService.log("FRIEND_REMOVED", null, currentUserId,
                "Removed friend: " + friendName);
    }

    @Transactional(readOnly = true)
    public List<FriendshipResponse> getFriends(String currentUserId) {
        List<Friendship> friendships = friendshipRepository.findFriendshipsByUserIdAndStatus(currentUserId, FriendshipStatus.ACCEPTED);
        return friendships.stream()
                .map(f -> mapToResponse(f, currentUserId))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FriendshipResponse> getPendingRequests(String currentUserId) {
        List<Friendship> received = friendshipRepository.findByFriend_IdAndStatus(currentUserId, FriendshipStatus.PENDING);
        List<Friendship> sent = friendshipRepository.findByUser_IdAndStatus(currentUserId, FriendshipStatus.PENDING);

        List<FriendshipResponse> responses = new ArrayList<>();
        for (Friendship f : received) {
            responses.add(mapToResponse(f, currentUserId));
        }
        for (Friendship f : sent) {
            responses.add(mapToResponse(f, currentUserId));
        }
        return responses;
    }

    private FriendshipResponse mapToResponse(Friendship friendship, String currentUserId) {
        User friend;
        String direction = null;

        if (friendship.getUser().getId().equals(currentUserId)) {
            friend = friendship.getFriend();
            if (friendship.getStatus() == FriendshipStatus.PENDING) {
                direction = "SENT";
            }
        } else {
            friend = friendship.getUser();
            if (friendship.getStatus() == FriendshipStatus.PENDING) {
                direction = "RECEIVED";
            }
        }

        return FriendshipResponse.builder()
                .id(friendship.getId())
                .friendId(friend.getId())
                .friendUsername(friend.getUsername())
                .friendEmail(friend.getEmail())
                .status(friendship.getStatus().name())
                .direction(direction)
                .createdAt(friendship.getCreatedAt())
                .build();
    }
}
