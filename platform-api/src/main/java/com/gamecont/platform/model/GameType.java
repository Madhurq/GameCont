package com.gamecont.platform.model;

/**
 * Supported game types. Each type maps to a specific Docker image
 * in the server-images/ directory.
 *
 * @see com.gamecont.platform.service.GameServerManager#getImageForGameType(GameType)
 */
public enum GameType {

    /** Vanilla Minecraft server (itzg/minecraft-server with TYPE=VANILLA) */
    MINECRAFT_VANILLA,

    /** Modded Minecraft server with Forge/Fabric support */
    MINECRAFT_MODDED,

    /** User-provided custom game server image */
    CUSTOM
}
