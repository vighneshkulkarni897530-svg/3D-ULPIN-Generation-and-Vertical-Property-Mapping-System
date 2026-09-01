/**
 * Legacy compatibility shim for the removed Supabase server client.
 * Firebase is the active backend in this project.
 */

export function createServerSupabaseClient(): any {
  throw new Error('Supabase has been removed. This app now uses Firebase Authentication and Firestore.');
}

export function createAnonSupabaseClient(): any {
  throw new Error('Supabase has been removed. This app now uses Firebase Authentication and Firestore.');
}

export function createUserSupabaseClient(_accessToken: string): any {
  throw new Error('Supabase has been removed. This app now uses Firebase Authentication and Firestore.');
}

export function isSupabaseConfigured(): boolean {
  return false;
}

export const isSupabaseServiceConfigured = () => false;

