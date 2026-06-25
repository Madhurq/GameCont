# GameCont — Minecraft Vanilla Server Image
# Based on the official itzg/minecraft-server image which handles EULA,
# version management, and server configuration automatically.
#
# ⚠️ Resource note: Minecraft server needs 256 MB–1 GB RAM minimum.
#    On t3.micro (1 GB total), only 1 server is practical alongside K3s.

FROM itzg/minecraft-server:latest

# Labels for GameCont platform identification
LABEL maintainer="gamecont"
LABEL com.gamecont.game-type="minecraft-vanilla"

# Default environment variables (overridden by K8s ConfigMap)
ENV EULA=TRUE
ENV TYPE=VANILLA
ENV VERSION=LATEST
ENV MEMORY=512M
ENV MAX_PLAYERS=10
ENV DIFFICULTY=normal
ENV GAMEMODE=survival
ENV ENABLE_QUERY=true
ENV QUERY_PORT=25565
ENV ENABLE_RCON=true
ENV RCON_PORT=25575
# RCON password must be set via K8s environment variable at deployment time

# Health check: verify server is accepting connections
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD mc-health || exit 1

# Server data directory (mounted as PVC in K8s)
VOLUME /data

# Game port + RCON port
EXPOSE 25565 25575

# The base image handles the entrypoint
