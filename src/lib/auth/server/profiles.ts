/**
 * Profile Store (Phase 14) — SERVER-ONLY
 * ========================================
 * Data access for application user profiles, backed by the `public.profiles`
 * table (migration 016). Replaces the Phase 10 in-memory `userStore`.
 *
 *   - The profile id is the Supabase Auth user's UUID (auth.users.id).
 *   - Passwords are NEVER stored here — credentials are managed exclusively
 *     by Supabase Auth.
 *   - Two access paths, both server-side:
 *       1. service-role client (when SUPABASE_SERVICE_ROLE_KEY is configured)
 *          — used for admin operations that already passed requirePermission;
 *       2. user-context client (publishable key + the caller's VERIFIED
 *          access token) — every query then runs under Row Level Security as
 *          that user, so the application can never bypass RBAC.
 *   - A missing profile is self-healed on first session use (CITIZEN, ACTIVE)
 *     so signups created before the profile insert (or users created in the
 *     Supabase dashboard) still function safely.
 *
 * When the Supabase database is entirely unavailable every function degrades
 * gracefully (null / error result) instead of throwing — auth endpoints map
 * that to clear 503 responses.
 */

import type { User, UserRole } from '@/types';
import type { DbProfile } from '@/lib/supabase/types';

type SupabaseAuthUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};
import {
  createServerSupabaseClient,
  createUserSupabaseClient,
  isSupabaseConfigured,
} from '@/lib/supabase/server';

/** Application-facing profile (camelCase mirror of DbProfile). */
export interface ProfileRecord {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  aadhaarOrGovId: string | null;
  role: UserRole;
  accountStatus: 'ACTIVE' | 'DISABLED';
  avatarUrl: string | null;
  department: string | null;
  designation: string | null;
  jurisdictionDistrict: string | null;
  badgeNumber: string | null;
  createdAt: string | null;
}

/** Payload Supabase Auth lets us attach to a user at sign-up time. */
export interface AuthUserMetadata {
  full_name?: string;
  name?: string;
  phone?: string;
  aadhaar_or_gov_id?: string;
  avatar_url?: string;
  department?: string;
  designation?: string;
  jurisdiction_district?: string;
  badge_number?: string;
  [key: string]: unknown;
}

/** Error reasons surfaced by profile mutations. */
export type ProfileStoreError = 'DB_UNAVAILABLE' | 'DB_ERROR' | 'NOT_FOUND' | 'SELF_MODIFICATION' | 'ADMIN_PROTECTED';

function metadataOf(authUser: SupabaseAuthUser): AuthUserMetadata {
  return (authUser.user_metadata ?? {}) as AuthUserMetadata;
}

function rowToProfile(row: DbProfile): ProfileRecord {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    aadhaarOrGovId: row.aadhaar_or_gov_id,
    role: row.role as UserRole,
    accountStatus: row.account_status as 'ACTIVE' | 'DISABLED',
    avatarUrl: row.avatar_url,
    department: row.department,
    designation: row.designation,
    jurisdictionDistrict: row.jurisdiction_district,
    badgeNumber: row.badge_number,
    createdAt: row.created_at ?? null,
  };
}

/**
 * Public projection of an authenticated user — safe to serialise to clients.
 * Strips all token material; identity fields come from the verified auth user
 * and the DB profile (role/status), never from client-supplied values.
 */
export function toPublicUser(authUser: SupabaseAuthUser, profile?: ProfileRecord): User {
  const meta = metadataOf(authUser);
  const name =
    profile?.fullName ??
    meta.full_name ??
    meta.name ??
    authUser.email?.split('@')[0] ??
    'Unnamed User';
  return {
    id: authUser.id,
    name,
    email: profile?.email ?? authUser.email ?? '',
    role: profile?.role ?? 'CITIZEN',
    phone: profile?.phone ?? meta.phone ?? '',
    aadhaarOrGovId: profile?.aadhaarOrGovId ?? meta.aadhaar_or_gov_id ?? 'PENDING-KYC',
    ...(profile?.avatarUrl || meta.avatar_url ? { avatarUrl: profile?.avatarUrl ?? meta.avatar_url } : {}),
    ...(profile?.department || meta.department ? { department: profile?.department ?? meta.department } : {}),
    ...(profile?.designation || meta.designation ? { designation: profile?.designation ?? meta.designation } : {}),
    ...(profile?.jurisdictionDistrict || meta.jurisdiction_district
      ? { jurisdictionDistrict: profile?.jurisdictionDistrict ?? meta.jurisdiction_district }
      : {}),
    ...(profile?.badgeNumber || meta.badge_number ? { badgeNumber: profile?.badgeNumber ?? meta.badge_number } : {}),
    accountStatus: profile?.accountStatus ?? 'ACTIVE',
    ...(profile?.createdAt ? { createdAt: profile.createdAt } : {}),
  };
}

/**
 * Public projection of a profile WITHOUT an auth-user record (used by the
 * admin account list). Strips all sensitive material.
 */
export function toProfilePublicUser(profile: ProfileRecord): User {
  return {
    id: profile.id,
    name: profile.fullName,
    email: profile.email,
    role: profile.role,
    phone: profile.phone ?? '',
    aadhaarOrGovId: profile.aadhaarOrGovId ?? '',
    ...(profile.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
    ...(profile.department ? { department: profile.department } : {}),
    ...(profile.designation ? { designation: profile.designation } : {}),
    ...(profile.jurisdictionDistrict ? { jurisdictionDistrict: profile.jurisdictionDistrict } : {}),
    ...(profile.badgeNumber ? { badgeNumber: profile.badgeNumber } : {}),
    accountStatus: profile.accountStatus,
    ...(profile.createdAt ? { createdAt: profile.createdAt } : {}),
  };
}

// ── Read paths ───────────────────────────────────────────────────────────────

/**
 * Loads a profile by id. Prefers the service-role client when configured,
 * otherwise queries as the caller (RLS: a user can always read their own
 * profile; admins can read all). Returns null when unavailable.
 */
export async function loadProfileById(id: string, accessToken?: string): Promise<ProfileRecord | null> {
  // 1) Service-role (authoritative, bypasses RLS).
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
      if (!error && data) return rowToProfile(data as DbProfile);
    } catch {
      // fall through to the user-context path
    }
  }
  // 2) As the verified caller — constrained by RLS.
  if (accessToken) {
    try {
      const supabase = createUserSupabaseClient(accessToken);
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
      if (!error && data) return rowToProfile(data as DbProfile);
    } catch {
      // fall through
    }
  }
  return null;
}

/**
 * Loads a profile or self-heals one from the verified auth user (CITIZEN /
 * ACTIVE). The insert runs as the caller so RLS constrains it (own profile,
 * role forced to CITIZEN by policy); with a service-role key it runs
 * privileged instead. Returns null when the database is unreachable —
 * callers then fall back to the auth-user projection (least privilege).
 */
export async function ensureProfileForAuthUser(
  authUser: SupabaseAuthUser,
  accessToken?: string,
): Promise<ProfileRecord | null> {
  const existing = await loadProfileById(authUser.id, accessToken);
  if (existing) return existing;

  const meta = metadataOf(authUser);
  const values = {
    id: authUser.id,
    email: authUser.email ?? '',
    full_name: meta.full_name ?? meta.name ?? authUser.email?.split('@')[0] ?? 'Unnamed User',
    phone: meta.phone ?? null,
    aadhaar_or_gov_id: meta.aadhaar_or_gov_id ?? 'PENDING-KYC',
    role: 'CITIZEN' as const,
    account_status: 'ACTIVE' as const,
    ...(meta.avatar_url ? { avatar_url: meta.avatar_url } : {}),
  };

  const insertWith = async (useServiceRole: boolean): Promise<boolean> => {
    try {
      const supabase = useServiceRole ? createServerSupabaseClient() : createUserSupabaseClient(accessToken!);
      const { error } = await supabase.from('profiles').upsert(values, { onConflict: 'id', ignoreDuplicates: true });
      return !error;
    } catch {
      return false;
    }
  };

  if (isSupabaseConfigured()) {
    await insertWith(true);
  } else if (accessToken) {
    await insertWith(false);
  }

  return loadProfileById(authUser.id, accessToken);
}

// ── Admin paths (user-management API; authorization checked in the route) ────

/** Lists all profiles (newest first). Requires service-role or an admin JWT. */
export async function listProfiles(
  adminAccessToken?: string,
): Promise<{ profiles: ProfileRecord[]; error: ProfileStoreError | null }> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (!error && data) return { profiles: (data as DbProfile[]).map(rowToProfile), error: null };
      return { profiles: [], error: 'DB_ERROR' };
    } catch {
      // fall through
    }
  }
  if (adminAccessToken) {
    try {
      const supabase = createUserSupabaseClient(adminAccessToken);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (!error && data) return { profiles: (data as DbProfile[]).map(rowToProfile), error: null };
      return { profiles: [], error: 'DB_ERROR' };
    } catch {
      // fall through
    }
  }
  return { profiles: [], error: 'DB_UNAVAILABLE' };
}

/** Administrative role / status update. Requires service-role or an admin JWT. */
export async function updateProfileAdmin(
  id: string,
  patch: { role?: UserRole; account_status?: 'ACTIVE' | 'DISABLED' },
  adminAccessToken?: string,
): Promise<{ profile: ProfileRecord | null; error: ProfileStoreError | null }> {
  if (Object.keys(patch).length === 0) {
    const current = await loadProfileById(id, adminAccessToken);
    return { profile: current, error: current ? null : 'NOT_FOUND' };
  }

  const run = async (useServiceRole: boolean): Promise<{ profile: ProfileRecord | null; error: ProfileStoreError | null }> => {
    try {
      const supabase = useServiceRole ? createServerSupabaseClient() : createUserSupabaseClient(adminAccessToken!);
      const { data, error } = await supabase.from('profiles').update(patch).eq('id', id).select().maybeSingle();
      if (error) {
        // PostgREST surfaces zero-row updates without error — verify existence.
        const current = await loadProfileById(id, adminAccessToken);
        return current ? { profile: current, error: 'DB_ERROR' } : { profile: null, error: 'NOT_FOUND' };
      }
      if (!data) return { profile: null, error: 'NOT_FOUND' };
      return { profile: rowToProfile(data as DbProfile), error: null };
    } catch {
      return { profile: null, error: 'DB_ERROR' };
    }
  };

  if (isSupabaseConfigured()) return run(true);
  if (adminAccessToken) return run(false);
  return { profile: null, error: 'DB_UNAVAILABLE' };
}

