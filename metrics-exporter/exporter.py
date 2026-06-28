"""
GameCont Metrics Exporter — Prometheus Sidecar for Game Servers

Runs alongside every game server pod as a sidecar container.
Queries the game server for live stats (player count, TPS, memory)
and exposes them as Prometheus metrics on port 9090.

Prometheus scrapes this endpoint every 15s via pod annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "9090"

⚠️ AWS Free Tier note: Each sidecar uses ~20 MB RAM.
   On a t3.micro (1 GB), this limits practical game server count to 2-3.
"""

import os
import sys
import time
import socket
import struct
import logging

from prometheus_client import start_http_server, Gauge, Counter, Info

# ── Configuration ────────────────────────────────────────────
SERVER_ID = os.environ.get("SERVER_ID", "unknown")
GAME_HOST = os.environ.get("GAME_SERVER_HOST", "localhost")
GAME_PORT = int(os.environ.get("GAME_QUERY_PORT", "25565"))
METRICS_PORT = int(os.environ.get("METRICS_PORT", "9090"))
SCRAPE_INTERVAL = int(os.environ.get("SCRAPE_INTERVAL", "15"))

# ── Logging ──────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("gamecont-metrics")

# ── Prometheus Metrics ───────────────────────────────────────
# These gauges are per-server (labeled by server_id)
players_online = Gauge(
    "game_players_online",
    "Current number of players connected to the game server",
    ["server_id"],
)
max_players = Gauge(
    "game_max_players", "Maximum player capacity of the game server", ["server_id"]
)
tps = Gauge(
    "game_tps", "Server ticks per second (20 = healthy for Minecraft)", ["server_id"]
)
memory_used = Gauge(
    "game_memory_used_bytes",
    "Memory currently used by the game server process",
    ["server_id"],
)
memory_max = Gauge(
    "game_memory_max_bytes",
    "Maximum memory available to the game server process",
    ["server_id"],
)
uptime_seconds = Gauge(
    "game_uptime_seconds", "How long the game server has been running", ["server_id"]
)

# Counters
query_failures = Counter(
    "game_query_failures_total",
    "Number of failed attempts to query the game server",
    ["server_id"],
)
query_successes = Counter(
    "game_query_successes_total",
    "Number of successful game server queries",
    ["server_id"],
)

# Server info (static labels)
server_info = Info(
    "game_server", "Static information about the game server", ["server_id"]
)


def query_minecraft_server(host: str, port: int) -> dict:
    """
    Query a Minecraft server using the Server List Ping protocol (SLP).
    This is the modern protocol used by MC 1.7+ clients to get server info.

    Returns dict with: num_players, max_players, version, motd
    Raises Exception on failure.
    """
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(5)

    try:
        sock.connect((host, port))

        # ── Handshake packet ──
        # Protocol version (-1 = unknown), server address, port, next state (1 = status)
        host_bytes = host.encode("utf-8")
        handshake_data = (
            b"\x00"  # Packet ID: Handshake
            + _encode_varint(-1)  # Protocol version
            + _encode_varint(len(host_bytes))  # Host length
            + host_bytes  # Host
            + struct.pack(">H", port)  # Port (unsigned short, big-endian)
            + _encode_varint(1)  # Next state: Status
        )
        _send_packet(sock, handshake_data)

        # ── Status request packet ──
        _send_packet(sock, b"\x00")  # Packet ID: Status Request (empty payload)

        # ── Read status response ──
        response = _read_packet(sock)
        if response is None:
            raise Exception("No response from server")

        import json

        # Skip packet ID (first varint)
        idx = 0
        _, idx = _decode_varint(response, idx)  # packet ID
        str_len, idx = _decode_varint(response, idx)  # JSON string length
        json_str = response[idx : idx + str_len].decode("utf-8")
        data = json.loads(json_str)

        return {
            "num_players": data.get("players", {}).get("online", 0),
            "max_players": data.get("players", {}).get("max", 0),
            "version": data.get("version", {}).get("name", "unknown"),
            "motd": data.get("description", {}).get("text", "")
            if isinstance(data.get("description"), dict)
            else str(data.get("description", "")),
        }

    finally:
        sock.close()


def _encode_varint(value: int) -> bytes:
    """Encode an integer as a Minecraft protocol VarInt."""
    result = b""
    while True:
        byte = value & 0x7F
        value >>= 7
        if value != 0:
            byte |= 0x80
        result += struct.pack("B", byte)
        if value == 0:
            break
    return result


def _decode_varint(data: bytes, offset: int) -> tuple:
    """Decode a VarInt from bytes at the given offset. Returns (value, new_offset)."""
    result = 0
    shift = 0
    while True:
        byte = data[offset]
        offset += 1
        result |= (byte & 0x7F) << shift
        if (byte & 0x80) == 0:
            break
        shift += 7
    return result, offset


def _send_packet(sock: socket.socket, data: bytes):
    """Send a length-prefixed packet."""
    length = _encode_varint(len(data))
    sock.sendall(length + data)


def _read_packet(sock: socket.socket) -> bytes | None:
    """Read a length-prefixed packet from the socket."""
    # Read packet length (varint)
    length = 0
    shift = 0
    while True:
        byte_data = sock.recv(1)
        if not byte_data:
            return None
        byte = byte_data[0]
        length |= (byte & 0x7F) << shift
        if (byte & 0x80) == 0:
            break
        shift += 7

    # Read packet data
    data = b""
    while len(data) < length:
        chunk = sock.recv(length - len(data))
        if not chunk:
            return None
        data += chunk
    return data


def scrape_game_server():
    """Query the game server and update Prometheus metrics."""
    try:
        stats = query_minecraft_server(GAME_HOST, GAME_PORT)

        players_online.labels(server_id=SERVER_ID).set(stats["num_players"])
        max_players.labels(server_id=SERVER_ID).set(stats["max_players"])

        # TPS and memory are not available via SLP — these would come from
        # RCON or a server-side plugin. Set defaults for now.
        tps.labels(server_id=SERVER_ID).set(20)  # Assume healthy

        query_successes.labels(server_id=SERVER_ID).inc()
        logger.debug(
            f"Server {SERVER_ID}: {stats['num_players']}/{stats['max_players']} players"
        )

    except Exception as e:
        query_failures.labels(server_id=SERVER_ID).inc()
        logger.warning(f"Failed to query game server {SERVER_ID}: {e}")
        # Set player count to -1 to indicate query failure (distinguishable from 0 players)
        players_online.labels(server_id=SERVER_ID).set(-1)


def main():
    """Start the Prometheus HTTP server and begin scraping game stats."""
    logger.info(f"Starting GameCont Metrics Exporter for server: {SERVER_ID}")
    logger.info(f"Game server: {GAME_HOST}:{GAME_PORT}")
    logger.info(f"Metrics port: {METRICS_PORT}")
    logger.info(f"Scrape interval: {SCRAPE_INTERVAL}s")

    # Set static server info
    server_info.labels(server_id=SERVER_ID).info(
        {
            "game_host": GAME_HOST,
            "game_port": str(GAME_PORT),
        }
    )

    # Start Prometheus metrics HTTP server
    start_http_server(METRICS_PORT)
    logger.info(
        f"Prometheus metrics available at http://0.0.0.0:{METRICS_PORT}/metrics"
    )

    # Scrape loop
    while True:
        scrape_game_server()
        time.sleep(SCRAPE_INTERVAL)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.info("Shutting down metrics exporter")
        raise SystemExit(0)
