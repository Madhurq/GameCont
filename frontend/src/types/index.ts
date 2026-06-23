export type ServerStatus =
  | 'STARTING'
  | 'RUNNING'
  | 'STOPPING'
  | 'STOPPED'
  | 'SLEEPING'
  | 'ERROR';

export type GameType = 'MINECRAFT_VANILLA' | 'MINECRAFT_MODDED' | 'CUSTOM';

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  username: string;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface GameServer {
  id: string;
  serverId: string;
  name: string;
  gameType: GameType;
  status: ServerStatus;
  maxPlayers: number;
  region: string;
  cpuLimit: string;
  memoryLimit: string;
  storageGb: number;
  connectAddress: string | null;
  gamePort: number;
  nodePort: number | null;
  ownerId: string;
  ownerUsername: string;
  createdAt: string;
  lastActiveAt: string;
}

export interface CreateServerRequest {
  name: string;
  gameType: GameType;
  maxPlayers: number;
  region: string;
  cpuLimit: string;
  memoryLimit: string;
  storageGb: number;
  customImage?: string;
}

export interface ServerMetrics {
  serverId: string;
  playersOnline: number;
  maxPlayers: number;
  tps: number;
  memoryUsedBytes: number;
  memoryMaxBytes: number;
  uptimeSeconds: number;
  metricsAvailable: boolean;
}

export interface ConsoleLogEntry {
  timestamp: string;
  level: string;
  message: string;
}

export interface ServerStatusBadge {
  label: string;
  color: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  animate: boolean;
}
