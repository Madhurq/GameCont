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

    @Pattern(regexp = "^\\d+(\\.\\d+)?(m|cpu)?$", message = "Invalid CPU limit format")
    private String cpuLimit;

    @Pattern(regexp = "^\\d+(\\.\\d+)?(Mi|Gi|Ki|M|G|K)?$", message = "Invalid memory limit format")
    private String memoryLimit;

    @Min(value = 1, message = "Minimum 1 GB storage")
    @Max(value = 100, message = "Maximum 100 GB storage")
    private Integer storageGb;

    @Pattern(regexp = "^(|[a-zA-Z0-9][a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+:[a-zA-Z0-9_.-]+)$",
             message = "Invalid Docker image format")
    private String customImage;
}
