/**
 * Registry Client (Phase 13)
 * ===========================
 * Client-side loader for the `/api/registry/bootstrap` snapshot.
 *
 * The GISContext calls `fetchRegistryBootstrap()` on mount to hydrate its
 * state. Any failure (network error, 401 session expiry, malformed payload)
 * resolves to `null` so the context can silently keep serving the in-memory
 * demo dataset — the prototype never blocks on infrastructure.
 */

import type { RegistryBootstrapPayload } from '@/types/registry';

/** Minimal runtime shape check for the bootstrap payload. */
function isRegistryPayload(value: unknown): value is RegistryBootstrapPayload {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<RegistryBootstrapPayload>;
  return (
    (v.source === 'supabase' || v.source === 'mock') &&
    typeof v.generatedAt === 'string' &&
    Array.isArray(v.parcels) &&
    Array.isArray(v.buildings) &&
    Array.isArray(v.floors) &&
    Array.isArray(v.properties) &&
    Array.isArray(v.verifications) &&
    Array.isArray(v.conflicts) &&
    Array.isArray(v.activities) &&
    Array.isArray(v.demoSpatialIds)
  );
}

/**
 * Fetches the registry snapshot. Returns `null` when the snapshot cannot be
 * loaded (unauthenticated, network failure, or unexpected payload) — callers
 * should fall back to their local demo data in that case.
 */
export async function fetchRegistryBootstrap(): Promise<RegistryBootstrapPayload | null> {
  try {
    const res = await fetch('/api/registry/bootstrap', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const payload: unknown = await res.json();
    return isRegistryPayload(payload) ? payload : null;
  } catch {
    return null;
  }
}