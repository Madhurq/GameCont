import type { GameServer, ServerMetrics, ConsoleLogEntry } from '../types';

let serverIdCounter = 0;
const generateId = () => `gs-${(++serverIdCounter).toString(36).padStart(8, '0')}`;

export const mockServers: GameServer[] = [
  {
    id: '1',
    serverId: generateId(),
    name: 'Survival World',
    gameType: 'MINECRAFT_VANILLA',
    status: 'RUNNING',
    maxPlayers: 10,
    region: 'us-east-1',
    cpuLimit: '500m',
    memoryLimit: '1024Mi',
    storageGb: 5,
    connectAddress: 'gamecont.io:30001',
    gamePort: 25565,
    nodePort: 30001,
    ownerId: 'user-1',
    ownerUsername: 'admin',
    createdAt: '2025-01-15T10:30:00Z',
    lastActiveAt: new Date().toISOString(),
  },
  {
    id: '2',
    serverId: generateId(),
    name: 'Modded Mayhem',
    gameType: 'MINECRAFT_MODDED',
    status: 'SLEEPING',
    maxPlayers: 20,
    region: 'eu-west-1',
    cpuLimit: '1000m',
    memoryLimit: '2048Mi',
    storageGb: 10,
    connectAddress: null,
    gamePort: 25565,
    nodePort: 30002,
    ownerId: 'user-1',
    ownerUsername: 'admin',
    createdAt: '2025-02-20T14:00:00Z',
    lastActiveAt: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: '3',
    serverId: generateId(),
    name: 'Creative Builds',
    gameType: 'MINECRAFT_VANILLA',
    status: 'STOPPED',
    maxPlayers: 5,
    region: 'us-west-2',
    cpuLimit: '250m',
    memoryLimit: '512Mi',
    storageGb: 2,
    connectAddress: null,
    gamePort: 25565,
    nodePort: 30003,
    ownerId: 'user-1',
    ownerUsername: 'admin',
    createdAt: '2025-03-10T08:00:00Z',
    lastActiveAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '4',
    serverId: generateId(),
    name: 'PvP Arena',
    gameType: 'CUSTOM',
    status: 'RUNNING',
    maxPlayers: 50,
    region: 'ap-southeast-1',
    cpuLimit: '2000m',
    memoryLimit: '4096Mi',
    storageGb: 20,
    connectAddress: 'gamecont.io:30004',
    gamePort: 25565,
    nodePort: 30004,
    ownerId: 'user-1',
    ownerUsername: 'admin',
    createdAt: '2025-04-01T12:00:00Z',
    lastActiveAt: new Date().toISOString(),
  },
  {
    id: '5',
    serverId: generateId(),
    name: 'MiniGames Hub',
    gameType: 'MINECRAFT_VANILLA',
    status: 'ERROR',
    maxPlayers: 16,
    region: 'eu-central-1',
    cpuLimit: '500m',
    memoryLimit: '1024Mi',
    storageGb: 3,
    connectAddress: null,
    gamePort: 25565,
    nodePort: null,
    ownerId: 'user-1',
    ownerUsername: 'admin',
    createdAt: '2025-05-05T16:00:00Z',
    lastActiveAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '6',
    serverId: generateId(),
    name: 'Skyblock',
    gameType: 'MINECRAFT_MODDED',
    status: 'STARTING',
    maxPlayers: 10,
    region: 'us-east-1',
    cpuLimit: '500m',
    memoryLimit: '1024Mi',
    storageGb: 4,
    connectAddress: null,
    gamePort: 25565,
    nodePort: null,
    ownerId: 'user-1',
    ownerUsername: 'admin',
    createdAt: '2025-06-01T20:00:00Z',
    lastActiveAt: new Date().toISOString(),
  },
];

let metricsCallCount = 0;

export function generateMockMetrics(serverId: string): ServerMetrics {
  metricsCallCount++;
  return {
    serverId,
    playersOnline: Math.floor(Math.abs(Math.sin(metricsCallCount * 0.1)) * 20),
    maxPlayers: 20,
    tps: 20 - Math.abs(Math.sin(metricsCallCount * 0.05)) * 5,
    memoryUsedBytes: 256 + Math.floor(Math.abs(Math.sin(metricsCallCount * 0.07)) * 512) * 1024 * 1024,
    memoryMaxBytes: 1024 * 1024 * 1024,
    uptimeSeconds: metricsCallCount * 5 * 60,
    metricsAvailable: true,
  };
}

export function generateMockLogs(): ConsoleLogEntry[] {
  const logs: ConsoleLogEntry[] = [];
  const levels = ['INFO', 'WARN', 'INFO', 'INFO', 'DEBUG'] as const;
  const messages = [
    'Server tick completed (20.0ms)',
    'Chunk load at [64, 32]',
    'Player "Steve" joined the game',
    'Auto-save complete',
    'Entity tick pool: 42 entities',
    'Memory: 342MB / 1024MB',
    'GC pause: 12ms',
    'Backup task queued',
    'TPS: 20.0 (target: 20.0)',
    'Network: 0.2ms avg latency',
  ];
  const now = Date.now();
  for (let i = 0; i < 20; i++) {
    logs.push({
      timestamp: new Date(now - (20 - i) * 3000).toISOString(),
      level: levels[Math.floor(Math.random() * levels.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
    });
  }
  return logs;
}

export function getServerStatusLabel(status: string): string {
  const map: Record<string, string> = {
    STARTING: 'Starting',
    RUNNING: 'Running',
    STOPPING: 'Stopping',
    STOPPED: 'Stopped',
    SLEEPING: 'Sleeping',
    ERROR: 'Error',
  };
  return map[status] ?? status;
}
