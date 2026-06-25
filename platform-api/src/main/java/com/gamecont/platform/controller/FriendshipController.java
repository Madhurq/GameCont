package com.gamecont.platform.controller;

import com.gamecont.platform.dto.FriendDtos.*;
import com.gamecont.platform.model.User;
import com.gamecont.platform.service.FriendshipService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/friends")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Friends", description = "User friendship and request management")
public class FriendshipController {

    private final FriendshipService friendshipService;

    public FriendshipController(FriendshipService friendshipService) {
        this.friendshipService = friendshipService;
    }

    @PostMapping("/request")
    @Operation(summary = "Send a new friend request by username")
    public ResponseEntity<FriendshipResponse> sendFriendRequest(
            @Valid @RequestBody FriendRequestRequest request,
            @AuthenticationPrincipal User currentUser) {
        FriendshipResponse response = friendshipService.sendFriendRequest(currentUser.getId(), request.getFriendUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/request/{id}/accept")
    @Operation(summary = "Accept a pending friend request")
    public ResponseEntity<FriendshipResponse> acceptFriendRequest(
            @PathVariable("id") String friendshipId,
            @AuthenticationPrincipal User currentUser) {
        FriendshipResponse response = friendshipService.acceptFriendRequest(currentUser.getId(), friendshipId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/request/{id}/decline")
    @Operation(summary = "Decline a pending friend request or cancel a sent request")
    public ResponseEntity<Void> declineOrCancelRequest(
            @PathVariable("id") String friendshipId,
            @AuthenticationPrincipal User currentUser) {
        friendshipService.declineOrCancelRequest(currentUser.getId(), friendshipId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Remove an active friendship")
    public ResponseEntity<Void> removeFriend(
            @PathVariable("id") String friendshipId,
            @AuthenticationPrincipal User currentUser) {
        friendshipService.removeFriend(currentUser.getId(), friendshipId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    @Operation(summary = "List all active friends")
    public ResponseEntity<List<FriendshipResponse>> listFriends(
            @AuthenticationPrincipal User currentUser) {
        List<FriendshipResponse> friends = friendshipService.getFriends(currentUser.getId());
        return ResponseEntity.ok(friends);
    }

    @GetMapping("/requests")
    @Operation(summary = "List all pending friend requests (both sent and received)")
    public ResponseEntity<List<FriendshipResponse>> listPendingRequests(
            @AuthenticationPrincipal User currentUser) {
        List<FriendshipResponse> requests = friendshipService.getPendingRequests(currentUser.getId());
        return ResponseEntity.ok(requests);
    }
}
