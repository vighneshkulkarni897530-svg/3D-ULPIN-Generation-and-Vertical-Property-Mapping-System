/**
 * GET /api/users — ADMIN ONLY
 * Lists all account profiles for the /admin/users management screen.
 * Authorization is enforced server-side (USER_MANAGEMENT permission).
 * Reads from Supabase `profiles` when configured, and falls back seamlessly
 * to the persistent userStore so user management always functions reliably.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { PERMISSIONS } from '@/types/auth';
import { requirePermission } from '@/lib/auth/server/apiAuth';
import { listProfiles, toProfilePublicUser } from '@/lib/auth/server/profiles';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { listUsers } from '@/lib/auth/server/userStore';

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, PERMISSIONS.USER_MANAGEMENT);
  if ('response' in auth) return auth.response;

  // 1) When Supabase is configured, try listProfiles
  if (isSupabaseConfigured()) {
    try {
      const { profiles, error } = await listProfiles(auth.user.accessToken);
      if (!error && profiles && profiles.length > 0) {
        return NextResponse.json({ users: profiles.map(toProfilePublicUser) });
      }
    } catch {}
  }

  // 2) Reliable fallback: persistent userStore
  const users = listUsers();
  return NextResponse.json({ users });
}
