import type { GameServer, ServerMetrics, CreateServerRequest, AuthResponse, LoginRequest, RegisterRequest, FriendshipResponse } from '../types';
import { mockServers, generateMockMetrics } from './mockData';

// ─── Config ───────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

/** Whether we've detected the backend is unreachable. */
let _offlineDetected = false;

/** The user can opt into simulator mode manually. */
let _simulatorMode = false;

export function isSimulatorMode(): boolean {
  return _simulatorMode;
}

export function setSimulatorMode(v: boolean): void {
  _simulatorMode = v;
}

export function isOfflineDetected(): boolean {
  return _offlineDetected;
}

// ─── Helpers ──────────────────────────────────────────────────────────
function getToken(): string | null {
  return localStorage.getItem('token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...authHeaders(), ...(init?.headers || {}) },
    });

    // Reset offline flag on successful contact
    _offlineDetected = false;

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(body || `HTTP ${res.status}`);
    }

    return res.json();
  } catch (err: any) {
    // Network errors (CORS, refused, timeout) → mark offline
    if (err instanceof TypeError && err.message.includes('fetch')) {
      _offlineDetected = true;
      throw new Error('BACKEND_OFFLINE');
    }
    throw err;
  }
}

function delay(ms = 600): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Auth (always attempts real API first) ────────────────────────────
export async function loginUser(data: LoginRequest): Promise<AuthResponse> {
  if (isSimulatorMode()) {
    await delay(800);
    return {
      token: 'sim-jwt-' + Date.now(),
      userId: 'sim-user-1',
      username: data.email.split('@')[0],
      email: data.email,
    };
  }
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function registerUser(data: RegisterRequest): Promise<AuthResponse> {
  if (isSimulatorMode()) {
    await delay(1000);
    return {
      token: 'sim-jwt-' + Date.now(),
      userId: 'sim-user-1',
      username: data.username,
      email: data.email,
    };
  }
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── Servers ──────────────────────────────────────────────────────────
export async function fetchServers(): Promise<GameServer[]> {
  if (isSimulatorMode()) {
    await delay();
    return [...mockServers];
  }
  return apiFetch<GameServer[]>('/servers');
}

export async function fetchServer(id: string): Promise<GameServer> {
  if (isSimulatorMode()) {
    await delay(300);
    const server = mockServers.find((s) => s.id === id);
    if (!server) throw new Error('Server not found');
    return { ...server };
  }
  return apiFetch<GameServer>(`/servers/${id}`);
}

export async function createServer(data: CreateServerRequest): Promise<GameServer> {
  if (isSimulatorMode()) {
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
      proxyPort: null,
      ownerId: 'sim-user-1',
      ownerUsername: 'simulator',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };
    mockServers.push(newServer);
    return newServer;
  }
  return apiFetch<GameServer>('/servers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchMetrics(serverId: string): Promise<ServerMetrics> {
  if (isSimulatorMode()) {
    await delay(200);
    return generateMockMetrics(serverId);
  }
  return apiFetch<ServerMetrics>(`/servers/${serverId}/metrics`);
}

export async function startServer(id: string): Promise<GameServer> {
  if (isSimulatorMode()) {
    await delay(1500);
    const server = mockServers.find((s) => s.id === id);
    if (!server) throw new Error('Server not found');
    server.status = 'STARTING';
    await delay(2000);
    server.status = 'RUNNING';
    server.connectAddress = `gamecont.io:${30000 + Math.floor(Math.random() * 1000)}`;
    return { ...server };
  }
  return apiFetch<GameServer>(`/servers/${id}/start`, { method: 'POST' });
}

export async function stopServer(id: string): Promise<GameServer> {
  if (isSimulatorMode()) {
    await delay(800);
    const server = mockServers.find((s) => s.id === id);
    if (!server) throw new Error('Server not found');
    server.status = 'STOPPING';
    await delay(1500);
    server.status = 'STOPPED';
    server.connectAddress = null;
    return { ...server };
  }
  return apiFetch<GameServer>(`/servers/${id}/stop`, { method: 'POST' });
}

export async function restartServer(id: string): Promise<GameServer> {
  if (isSimulatorMode()) {
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
  return apiFetch<GameServer>(`/servers/${id}/restart`, { method: 'POST' });
}

export async function deleteServer(id: string): Promise<void> {
  if (isSimulatorMode()) {
    await delay(600);
    const idx = mockServers.findIndex((s) => s.id === id);
    if (idx >= 0) mockServers.splice(idx, 1);
    return;
  }
  await apiFetch<void>(`/servers/${id}`, { method: 'DELETE' });
}

// ─── Console Commands ─────────────────────────────────────────────────
export async function sendCommand(serverId: string, command: string): Promise<void> {
  if (isSimulatorMode()) {
    await delay(200);
    return;
  }
  await apiFetch<void>(`/servers/${serverId}/command`, {
    method: 'POST',
    body: JSON.stringify({ command }),
  });
}

// ─── Server Updates ───────────────────────────────────────────────────
export async function updateServer(id: string, data: Partial<CreateServerRequest>): Promise<GameServer> {
  if (isSimulatorMode()) {
    await delay(600);
    const server = mockServers.find((s) => s.id === id);
    if (!server) throw new Error('Server not found');
    Object.assign(server, data);
    return { ...server };
  }
  return apiFetch<GameServer>(`/servers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ─── File Manager ─────────────────────────────────────────────────────
export interface FileEntry {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  lastModified: string;
}

export async function listFiles(serverId: string, path: string): Promise<FileEntry[]> {
  if (isSimulatorMode()) {
    await delay(300);
    return [
      { name: 'world', path: '/data/world', size: 0, isDirectory: true, lastModified: new Date().toISOString() },
      { name: 'server.properties', path: '/data/server.properties', size: 2048, isDirectory: false, lastModified: new Date().toISOString() },
      { name: 'logs', path: '/data/logs', size: 0, isDirectory: true, lastModified: new Date().toISOString() },
      { name: 'mods', path: '/data/mods', size: 0, isDirectory: true, lastModified: new Date().toISOString() },
      { name: 'banned-players.json', path: '/data/banned-players.json', size: 128, isDirectory: false, lastModified: new Date().toISOString() },
    ];
  }
  return apiFetch<FileEntry[]>(`/servers/${serverId}/files?path=${encodeURIComponent(path)}`);
}

export async function readFile(serverId: string, path: string): Promise<string> {
  if (isSimulatorMode()) {
    await delay(200);
    return '# Simulated file content\n';
  }
  const res = await apiFetch<{ content: string }>(`/servers/${serverId}/files/read?path=${encodeURIComponent(path)}`);
  return res.content;
}

export async function writeFile(serverId: string, path: string, content: string): Promise<void> {
  if (isSimulatorMode()) {
    await delay(400);
    return;
  }
  await apiFetch<void>(`/servers/${serverId}/files/write`, {
    method: 'POST',
    body: JSON.stringify({ path, content }),
  });
}

export async function deleteFilePath(serverId: string, path: string): Promise<void> {
  if (isSimulatorMode()) {
    await delay(300);
    return;
  }
  await apiFetch<void>(`/servers/${serverId}/files?path=${encodeURIComponent(path)}`, {
    method: 'DELETE',
  });
}

export async function uploadFile(serverId: string, path: string, file: File): Promise<void> {
  if (isSimulatorMode()) {
    await delay(800);
    return;
  }
  const formData = new FormData();
  formData.append('file', file);
  formData.append('path', path);
  await apiFetch<void>(`/servers/${serverId}/files/upload`, {
    method: 'POST',
    body: formData,
  });
}

/** Ping the backend to check connectivity — used by the offline banner. */
export async function pingBackend(): Promise<boolean> {
  try {
    await fetch(`${API_BASE.replace('/api', '')}/swagger-ui.html`, {
      method: 'HEAD',
      mode: 'no-cors',
    });
    _offlineDetected = false;
    return true;
  } catch {
    _offlineDetected = true;
    return false;
  }
}

// ─── Friends API ──────────────────────────────────────────────────────
export async function sendFriendRequest(friendUsername: string): Promise<FriendshipResponse> {
  if (isSimulatorMode()) {
    await delay(600);
    return {
      id: String(Date.now()),
      friendId: 'sim-user-friend',
      friendUsername,
      friendEmail: `${friendUsername}@example.com`,
      status: 'PENDING',
      direction: 'SENT',
      createdAt: new Date().toISOString(),
    };
  }
  return apiFetch<FriendshipResponse>('/friends/request', {
    method: 'POST',
    body: JSON.stringify({ friendUsername }),
  });
}

export async function acceptFriendRequest(id: string): Promise<FriendshipResponse> {
  if (isSimulatorMode()) {
    await delay(400);
    return {
      id,
      friendId: 'sim-user-friend',
      friendUsername: 'friend_user',
      friendEmail: 'friend@example.com',
      status: 'ACCEPTED',
      direction: null,
      createdAt: new Date().toISOString(),
    };
  }
  return apiFetch<FriendshipResponse>(`/friends/request/${id}/accept`, {
    method: 'POST',
  });
}

export async function declineFriendRequest(id: string): Promise<void> {
  if (isSimulatorMode()) {
    await delay(400);
    return;
  }
  await apiFetch<void>(`/friends/request/${id}/decline`, {
    method: 'POST',
  });
}

export async function removeFriend(id: string): Promise<void> {
  if (isSimulatorMode()) {
    await delay(400);
    return;
  }
  await apiFetch<void>(`/friends/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchFriends(): Promise<FriendshipResponse[]> {
  if (isSimulatorMode()) {
    await delay(300);
    return [
      {
        id: 'sim-friendship-1',
        friendId: 'sim-user-2',
        friendUsername: 'notch',
        friendEmail: 'notch@mojang.com',
        status: 'ACCEPTED',
        direction: null,
        createdAt: new Date().toISOString(),
      },
    ];
  }
  return apiFetch<FriendshipResponse[]>('/friends');
}

export async function fetchPendingRequests(): Promise<FriendshipResponse[]> {
  if (isSimulatorMode()) {
    await delay(300);
    return [
      {
        id: 'sim-friendship-2',
        friendId: 'sim-user-3',
        friendUsername: 'jeb_',
        friendEmail: 'jeb@mojang.com',
        status: 'PENDING',
        direction: 'RECEIVED',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sim-friendship-3',
        friendId: 'sim-user-4',
        friendUsername: 'dinnerbone',
        friendEmail: 'dbone@mojang.com',
        status: 'PENDING',
        direction: 'SENT',
        createdAt: new Date().toISOString(),
      },
    ];
  }
  return apiFetch<FriendshipResponse[]>('/friends/requests');
}

