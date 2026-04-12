import type { AppData } from '../types';
import { debugLog } from './debugLog';
import { getPendingResults, dequeueResult } from './resultQueue';

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
let pendingSaves = 0;

export function getCachedData(): AppData {
  return cachedData;
}

export function updateCachedData(updater: (prev: AppData) => AppData): void {
  cachedData = updater(cachedData);
}

export function isInitialLoadDone(): boolean {
  return initialLoadDone;
}

export function hasPendingSaves(): boolean {
  return pendingSaves > 0;
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

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, ms = 15_000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(id));
}

async function trackSave<T>(fn: () => Promise<T>): Promise<T> {
  pendingSaves++;
  try {
    return await fn();
  } finally {
    pendingSaves--;
  }
}

export async function apiPost(endpoint: string, body: unknown): Promise<unknown> {
  return trackSave(async () => {
    const res = await fetchWithTimeout(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });
}

export async function apiPostWithRetry(
  endpoint: string,
  body: unknown,
  retries = 2,
): Promise<unknown> {
  return trackSave(async () => {
    const delays = [2000, 4000];
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        debugLog(`POST ${endpoint} attempt ${attempt + 1}/${retries + 1}`);
        const res = await fetchWithTimeout(`${API_BASE}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        debugLog(`POST ${endpoint} succeeded on attempt ${attempt + 1}`);
        return await res.json();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        debugLog(`POST ${endpoint} attempt ${attempt + 1} failed: ${lastError.message}`, 'warn');
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, delays[attempt]));
        }
      }
    }
    debugLog(`POST ${endpoint} all ${retries + 1} attempts failed`, 'error');
    throw lastError!;
  });
}

export async function apiPatch(endpoint: string, body: unknown): Promise<unknown> {
  return trackSave(async () => {
    const res = await fetchWithTimeout(`${API_BASE}${endpoint}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });
}

export async function apiDelete(endpoint: string): Promise<void> {
  return trackSave(async () => {
    const res = await fetchWithTimeout(`${API_BASE}${endpoint}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  });
}

export function mergePendingResults(serverData: AppData): AppData {
  const pending = getPendingResults();
  if (pending.length === 0) return serverData;

  const serverResultIds = new Set(serverData.results.map(r => r.id));
  const missing = pending.filter(r => !serverResultIds.has(r.id));

  // Clean up any pending results that are now on the server
  const confirmed = pending.filter(r => serverResultIds.has(r.id));
  for (const r of confirmed) dequeueResult(r.id);

  if (missing.length === 0) return serverData;

  debugLog(`Merging ${missing.length} pending result(s) into server data`);
  return { ...serverData, results: [...serverData.results, ...missing] };
}
