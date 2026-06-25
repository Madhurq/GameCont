package com.gamecont.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.Instant;

public class FriendDtos {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class FriendRequestRequest {
        @NotBlank(message = "Username is required")
        private String friendUsername;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class FriendshipResponse {
        private String id;
        private String friendId;
        private String friendUsername;
        private String friendEmail;
        private String status;
        private String direction; // "SENT" or "RECEIVED"
        private Instant createdAt;
    }
}
