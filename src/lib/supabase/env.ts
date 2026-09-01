/**
 * Legacy Supabase environment compatibility shim.
 * The project has moved to Firebase Authentication + Firestore.
 */

export const SUPABASE_URL = '';
export const SUPABASE_PUBLISHABLE_KEY = '';
export const SUPABASE_SERVICE_ROLE_KEY = '';

export function isSupabaseAuthConfigured(): boolean {
  return false;
}

export function isSupabaseServiceConfigured(): boolean {
  return false;
}
