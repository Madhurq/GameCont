package com.gamecont.platform.controller;

import com.gamecont.platform.dto.FileEntry;
import com.gamecont.platform.dto.FileWriteRequest;
import com.gamecont.platform.model.User;
import com.gamecont.platform.service.GameServerManager;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/servers/{serverId}/files")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "File Manager", description = "Game server file management (browse, upload, download, delete)")
public class FileController {

    private final GameServerManager serverManager;

    public FileController(GameServerManager serverManager) {
        this.serverManager = serverManager;
    }

    @GetMapping
    @Operation(summary = "List files in a directory")
    public ResponseEntity<List<FileEntry>> listFiles(
            @PathVariable String serverId,
            @RequestParam(defaultValue = "/data") String path,
            @AuthenticationPrincipal User currentUser) {
        List<FileEntry> files = serverManager.listFiles(serverId, path, currentUser);
        return ResponseEntity.ok(files);
    }

    @GetMapping("/read")
    @Operation(summary = "Read a file's content")
    public ResponseEntity<Map<String, String>> readFile(
            @PathVariable String serverId,
            @RequestParam String path,
            @AuthenticationPrincipal User currentUser) {
        String content = serverManager.readFile(serverId, path, currentUser);
        return ResponseEntity.ok(Map.of("content", content));
    }

    @PostMapping("/write")
    @Operation(summary = "Write content to a file")
    public ResponseEntity<Void> writeFile(
            @PathVariable String serverId,
            @Valid @RequestBody FileWriteRequest request,
            @AuthenticationPrincipal User currentUser) {
        serverManager.writeFile(serverId, request.getPath(), request.getContent(), currentUser);
        return ResponseEntity.ok().build();
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload a file to the server")
    public ResponseEntity<Void> uploadFile(
            @PathVariable String serverId,
            @RequestParam String path,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User currentUser) throws IOException {
        serverManager.uploadFile(serverId, path, file.getBytes(), currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping
    @Operation(summary = "Delete a file or directory")
    public ResponseEntity<Void> deleteFile(
            @PathVariable String serverId,
            @RequestParam String path,
            @AuthenticationPrincipal User currentUser) {
        serverManager.deleteFilePath(serverId, path, currentUser);
        return ResponseEntity.noContent().build();
    }
}
