package com.gamecont.platform.dto;

import lombok.*;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileEntry {
    private String name;
    private String path;
    private long size;
    private boolean isDirectory;
    private String lastModified;
}
