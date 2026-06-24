import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { isSimulatorMode } from './api';

const WS_URL = 'http://localhost:8080/ws';

/**
 * Sets up a WebSocket connection to stream live console logs for a game server.
 *
 * In simulator mode, generates fake log messages on an interval.
 * In live mode, connects via SockJS + STOMP to the Spring Boot backend:
 *   - Subscribes to /topic/logs/{serverId}
 *   - Sends /app/logs/{serverId}/start to trigger log streaming
 *   - Sends /app/logs/{serverId}/stop on cleanup
 *
 * @returns A cleanup function that disconnects the WebSocket or clears the interval.
 */
export function setupWebSocket(
  serverId: string,
  onMessage: (msg: string) => void
): () => void {
  // ── Simulator Mode ──────────────────────────────────────────────
  if (isSimulatorMode()) {
    const levels = ['INFO', 'WARN', 'DEBUG', 'INFO', 'INFO'] as const;
    const messages = [
      'Server tick completed (20.0ms)',
      'Chunk load at [64, 32]',
      `Player heartbeat: ${Math.floor(Math.random() * 20)} online`,
      'Auto-save complete',
      'Memory: 342MB / 1024MB',
      'TPS: 20.0',
      'Entity tick pool: 42 entities',
      'GC pause: 12ms',
      'Backup task queued',
      'Network: 0.2ms avg latency',
      'Player "Steve" joined the game',
      'Player "Alex" left the game',
      'World save completed in 0.4s',
      'Keepalive packet sent',
      'Chunk [128, -64] unloaded',
    ];

    const interval = setInterval(() => {
      const lvl = levels[Math.floor(Math.random() * levels.length)];
      const msg = messages[Math.floor(Math.random() * messages.length)];
      onMessage(`[${lvl}] ${msg}`);
    }, 1500 + Math.random() * 1500);

    return () => clearInterval(interval);
  }

  // ── Live Mode: STOMP over SockJS ────────────────────────────────
  let stopped = false;

  const client = new Client({
    webSocketFactory: () => new SockJS(WS_URL) as any,
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,

    onConnect: () => {
      if (stopped) return;

      // Subscribe to live log topic
      client.subscribe(`/topic/logs/${serverId}`, (message) => {
        try {
          const payload = JSON.parse(message.body);
          if (payload.error) {
            onMessage(`[ERROR] ${payload.error}`);
          } else if (payload.line) {
            onMessage(payload.line);
          }
        } catch {
          // If body is plain text, use it directly
          onMessage(message.body);
        }
      });

      // Tell the server to start streaming logs
      client.publish({
        destination: `/app/logs/${serverId}/start`,
        body: '',
      });
    },

    onStompError: (frame) => {
      console.error('[STOMP Error]', frame.headers['message'], frame.body);
      onMessage(`[ERROR] STOMP connection error: ${frame.headers['message'] || 'unknown'}`);
    },

    onWebSocketClose: () => {
      if (!stopped) {
        onMessage('[WARN] WebSocket connection lost. Reconnecting...');
      }
    },
  });

  client.activate();

  // Cleanup function
  return () => {
    stopped = true;
    if (client.connected) {
      // Tell the server to stop streaming logs
      client.publish({
        destination: `/app/logs/${serverId}/stop`,
        body: '',
      });
    }
    client.deactivate();
  };
}
