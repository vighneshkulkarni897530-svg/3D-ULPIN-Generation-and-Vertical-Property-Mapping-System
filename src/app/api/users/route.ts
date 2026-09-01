/**
 * GET /api/users (Phase 14) — ADMIN ONLY
 * Lists all account profiles for the /admin/users management screen.
 * Authorization is enforced server-side (Supabase session + USER_MANAGEMENT
 * permission from the profiles table); accounts are read from the Supabase
 * `profiles` table (service-role, or the admin's own token under RLS).
 * 401 when unauthenticated, 403 when the session lacks USER_MANAGEMENT,
 * 503 when the Supabase database is unavailable.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { PERMISSIONS } from '@/types/auth';
import { requirePermission, jsonError } from '@/lib/auth/server/apiAuth';
import { listProfiles, toProfilePublicUser } from '@/lib/auth/server/profiles';

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, PERMISSIONS.USER_MANAGEMENT);
  if ('response' in auth) return auth.response;

  const { profiles, error } = await listProfiles(auth.user.accessToken);
  if (error === 'DB_UNAVAILABLE') {
    return jsonError(
      503,
      'DB_UNAVAILABLE',
      'User management requires the Supabase database. Configure the database connection (see docs/PHASE14_SUPABASE_AUTH.md).',
    );
  }
  if (error) {
    return jsonError(500, 'DB_ERROR', 'The account list could not be loaded. Please try again.');
  }

  return NextResponse.json({ users: profiles.map(toProfilePublicUser) });
}

