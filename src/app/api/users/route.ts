/**
 * GET /api/users (Phase 10) — ADMIN ONLY
 * Lists all accounts for the /admin/users management screen.
 * 401 when unauthenticated, 403 when the session lacks USER_MANAGEMENT.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { PERMISSIONS } from '@/types/auth';
import { requirePermission } from '@/lib/auth/server/apiAuth';
import { listUsers } from '@/lib/auth/server/userStore';

export async function GET(req: NextRequest) {
  const auth = requirePermission(req, PERMISSIONS.USER_MANAGEMENT);
  if ('response' in auth) return auth.response;

  return NextResponse.json({ users: listUsers() });
}
