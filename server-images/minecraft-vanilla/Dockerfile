# GameCont — Minecraft Vanilla Server Image
# Based on the official itzg/minecraft-server image which handles EULA,
# version management, and server configuration automatically.
#
# ⚠️ Resource note: Minecraft server needs 256 MB–1 GB RAM minimum.
#    On t3.micro (1 GB total), only 1 server is practical alongside K3s.

FROM itzg/minecraft-server:latest

# ponytail: :latest tracks upstream Java version (needed for MC 26.2+ which requires Java 25)

LABEL maintainer="gamecont"
LABEL com.gamecont.game-type="minecraft-vanilla"

# ponytail: only EULA needed — TYPE, VERSION, MEMORY etc. match base defaults or are set via K8s env
ENV EULA=TRUE

# Health check: verify server is accepting connections
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD mc-health || exit 1

# Server data directory (mounted as PVC in K8s)
VOLUME /data

# Game port + RCON port
EXPOSE 25565 25575

# The base image handles the entrypoint
