# GameCont — Minecraft Modded Server Image (Forge/Fabric)
# Extends the vanilla image with mod loader support.
# Mods are injected via ConfigMap volume mounts or baked into custom images
# using the Ansible build-server-image.yml playbook.

FROM itzg/minecraft-server:latest

LABEL maintainer="gamecont"
LABEL com.gamecont.game-type="minecraft-modded"

# Default environment (Forge mod loader)
ENV EULA=TRUE
ENV TYPE=FORGE
ENV VERSION=1.20.4
ENV FORGE_VERSION=RECOMMENDED
ENV MEMORY=768M
ENV MAX_PLAYERS=10
ENV DIFFICULTY=normal
ENV GAMEMODE=survival
ENV ENABLE_QUERY=true
ENV QUERY_PORT=25565
ENV ENABLE_RCON=true
ENV RCON_PORT=25575
ENV RCON_PASSWORD=gamecont_rcon

# Mods directory — mount via ConfigMap or PVC
# Users can upload mods through the platform dashboard,
# which triggers an Ansible playbook to rebuild the image.
VOLUME /data/mods

HEALTHCHECK --interval=60s --timeout=15s --retries=5 \
    CMD mc-health || exit 1

VOLUME /data
EXPOSE 25565 25575
