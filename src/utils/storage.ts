import type { AppData } from '../types';

const API_BASE = '/api';

const DEFAULT_DATA: AppData = {
  providerPasswordHash: '',
  kids: [],
  quizzes: [],
  results: [],
};

// In-memory cache for synchronous access (useState initializer)
let cachedData: AppData = { ...DEFAULT_DATA };
let initialLoadDone = false;

export function getCachedData(): AppData {
  return cachedData;
}

export function updateCachedData(updater: (prev: AppData) => AppData): void {
  cachedData = updater(cachedData);
}

export function isInitialLoadDone(): boolean {
  return initialLoadDone;
}

export async function loadAppData(): Promise<AppData> {
  try {
    const res = await fetch(`${API_BASE}/data`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    cachedData = { ...DEFAULT_DATA, ...await res.json() };
    initialLoadDone = true;
    return cachedData;
  } catch {
    return cachedData;
  }
}

export async function apiPost(endpoint: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function apiPatch(endpoint: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function apiDelete(endpoint: string): Promise<void> {
  const res = await fetch(`${API_BASE}${endpoint}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
