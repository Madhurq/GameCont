package com.gamecont.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class CommandRequest {
    @NotBlank(message = "Command is required")
    @Size(max = 2000, message = "Command must be at most 2000 characters")
    @Pattern(regexp = "^[\\x20-\\x7E]+$", message = "Command contains invalid characters")
    private String command;
}
