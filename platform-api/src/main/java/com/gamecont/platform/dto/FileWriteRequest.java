package com.gamecont.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class FileWriteRequest {
    @NotBlank(message = "Path is required")
    @Size(max = 500, message = "Path too long")
    private String path;

    @NotBlank(message = "Content is required")
    @Size(max = 10_485_760, message = "Content exceeds 10 MB limit")
    private String content;
}
