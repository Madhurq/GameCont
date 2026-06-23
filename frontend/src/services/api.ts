import type { GameServer, ServerMetrics, CreateServerRequest } from '../types';
import { mockServers, generateMockMetrics, generateMockLogs } from './mockData';

function delay(ms = 600): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchServers(): Promise<GameServer[]> {
  await delay();
  return [...mockServers];
}

export async function fetchServer(id: string): Promise<GameServer> {
  await delay(300);
  const server = mockServers.find((s) => s.id === id);
  if (!server) throw new Error('Server not found');
  return { ...server };
}

export async function createServer(data: CreateServerRequest): Promise<GameServer> {
  await delay(1200);
  const newServer: GameServer = {
    id: String(Date.now()),
    serverId: `gs-${Math.random().toString(36).slice(2, 10)}`,
    name: data.name,
    gameType: data.gameType,
    status: 'STARTING',
    maxPlayers: data.maxPlayers,
    region: data.region,
    cpuLimit: data.cpuLimit,
    memoryLimit: data.memoryLimit,
    storageGb: data.storageGb,
    connectAddress: null,
    gamePort: 25565,
    nodePort: null,
    ownerId: 'user-1',
    ownerUsername: 'admin',
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };
  return newServer;
}

export async function fetchMetrics(serverId: string): Promise<ServerMetrics> {
  await delay(200);
  return generateMockMetrics(serverId);
}

export async function startServer(id: string): Promise<GameServer> {
  await delay(1500);
  const server = mockServers.find((s) => s.id === id);
  if (!server) throw new Error('Server not found');
  server.status = 'STARTING';
  await delay(2000);
  server.status = 'RUNNING';
  server.connectAddress = `gamecont.io:${30000 + Math.floor(Math.random() * 1000)}`;
  return { ...server };
}

export async function stopServer(id: string): Promise<GameServer> {
  await delay(800);
  const server = mockServers.find((s) => s.id === id);
  if (!server) throw new Error('Server not found');
  server.status = 'STOPPING';
  await delay(1500);
  server.status = 'STOPPED';
  server.connectAddress = null;
  return { ...server };
}

export async function restartServer(id: string): Promise<GameServer> {
  await delay(500);
  const server = mockServers.find((s) => s.id === id);
  if (!server) throw new Error('Server not found');
  server.status = 'STOPPING';
  await delay(1500);
  server.status = 'STARTING';
  await delay(2000);
  server.status = 'RUNNING';
  return { ...server };
}

export function getConsoleLogs() {
  return generateMockLogs();
}
