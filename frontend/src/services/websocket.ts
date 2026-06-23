export function setupWebSocket(_serverId: string, onMessage: (msg: string) => void): () => void {
  const interval = setInterval(() => {
    const levels = ['INFO', 'WARN', 'DEBUG'] as const;
    const messages = [
      'Server tick completed (20.0ms)',
      'Chunk load at [64, 32]',
      `Player heartbeat: ${Math.floor(Math.random() * 20)} online`,
      'Auto-save complete',
      'Memory: 342MB / 1024MB',
      'TPS: 20.0',
    ];
    const msg = `[${levels[Math.floor(Math.random() * levels.length)]}] ${
      messages[Math.floor(Math.random() * messages.length)]
    }`;
    onMessage(msg);
  }, 2000);

  return () => clearInterval(interval);
}
