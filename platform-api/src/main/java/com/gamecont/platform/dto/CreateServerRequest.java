package com.gamecont.platform.dto;

import com.gamecont.platform.model.GameType;
import jakarta.validation.constraints.*;
import lombok.*;

/**
 * Request DTO for creating a new game server.
 * Validated before being passed to GameServerManager.
 */
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateServerRequest {

    @NotBlank(message = "Server name is required")
    @Size(min = 3, max = 100, message = "Server name must be between 3 and 100 characters")
    private String name;

    @NotNull(message = "Game type is required")
    private GameType gameType;

    @Min(value = 1, message = "At least 1 player slot required")
    @Max(value = 100, message = "Maximum 100 player slots")
    private int maxPlayers = 10;

    @Size(max = 20, message = "Region code too long")
    private String region;

    // Resource limits — defaults are set in application.yml
    private String cpuLimit;
    private String memoryLimit;
    private Integer storageGb;

    /** Custom Docker image for CUSTOM game type */
    private String customImage;
}
