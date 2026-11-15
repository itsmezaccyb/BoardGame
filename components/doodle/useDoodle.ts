'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { StateResponse } from '@/lib/doodle/game';

const API = '/api/doodle-relay';

export const tokenKey = (code: string) => `doodle-relay:token:${code.toUpperCase()}`;
export const NAME_KEY = 'doodle-relay:name';
export const LAST_CODE_KEY = 'doodle-relay:last-code';
export const CATEGORIES_KEY = 'doodle-relay:categories';

export function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function storageSet(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode etc. — the game still works for this tab */
  }
}

export async function api<T = unknown>(path: string, body?: unknown, method?: 'POST' | 'DELETE'): Promise<T> {
  const res = await fetch(`${API}/${path}`, {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json as T;
}

/** Poll the game state about once a second. */
export function useDoodleState(code: string | null, token: string | null) {
  const [state, setState] = useState<StateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!code || inFlight.current) return;
    inFlight.current = true;
    try {
      const params = new URLSearchParams({ code });
      if (token) params.set('token', token);
      const sentAt = Date.now();
      const next = await api<StateResponse>(`state?${params}`);
      const midpoint = (sentAt + Date.now()) / 2;
      setClockOffset(new Date(next.serverNow).getTime() - midpoint);
      setState(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lost connection');
    } finally {
      inFlight.current = false;
    }
  }, [code, token]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 1000);
    return () => clearInterval(id);
  }, [refresh]);

  return { state, error, clockOffset, refresh };
}

/** Seconds left in the round, or null when there is no timer. */
export function useCountdown(state: StateResponse | null, clockOffset: number): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  if (!state || state.status !== 'playing' || !state.timerSeconds || !state.roundStartedAt) return null;
  const endsAt = new Date(state.roundStartedAt).getTime() + state.timerSeconds * 1000;
  return Math.max(0, Math.ceil((endsAt - (now + clockOffset)) / 1000));
}

const loaded = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

function loadDrawing(code: string, id: string): Promise<string> {
  const hit = loaded.get(id);
  if (hit !== undefined) return Promise.resolve(hit);
  let p = pending.get(id);
  if (!p) {
    p = api<{ content: string }>(`entry?${new URLSearchParams({ code, id })}`)
      .then(({ content }) => {
        loaded.set(id, content);
        return content;
      })
      .finally(() => pending.delete(id));
    pending.set(id, p);
  }
  return p;
}

/**
 * Load a drawing by entry id: undefined while loading, '' for a blank page.
 * Drawings never change, so they're cached for the life of the page.
 */
export function useDrawing(code: string | null, entryId: string | undefined): string | undefined {
  const [src, setSrc] = useState<string | undefined>(entryId ? loaded.get(entryId) : undefined);
  useEffect(() => {
    if (!code || !entryId) {
      setSrc(undefined);
      return;
    }
    let cancelled = false;
    setSrc(loaded.get(entryId));
    loadDrawing(code, entryId)
      .then((content) => !cancelled && setSrc(content))
      .catch(() => !cancelled && setSrc(''));
    return () => {
      cancelled = true;
    };
  }, [code, entryId]);
  return src;
}

/** Warm the cache for drawings that are about to be shown. */
export function prefetchDrawings(code: string, entryIds: string[]) {
  for (const id of entryIds) loadDrawing(code, id).catch(() => {});
}
