/**
 * Legacy compatibility shim for the removed Supabase client.
 * Firebase is now the active backend.
 */

export function getBrowserSupabaseClient() {
  return null;
}

export function isBrowserSupabaseAvailable(): boolean {
  return false;
}

