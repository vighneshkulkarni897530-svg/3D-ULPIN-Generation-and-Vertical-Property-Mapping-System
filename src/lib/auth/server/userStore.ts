/**
 * PROTOTYPE User Store (Phase 10) — SERVER-ONLY
 * ===============================================
 * ⚠ PROTOTYPE-ONLY STORAGE: users live in the Node.js process memory of the
 *   Next.js server. Nothing is persisted to disk or a database. Registered
 *   accounts are lost when the server restarts. This is NOT a production
 *   user database — it exists so Phase 10 can demonstrate real credential
 *   checking, hashing and account management without new dependencies.
 *
 * A production deployment would replace this module with a database-backed
 * implementation behind the same exported function signatures.
 *
 * SECURITY NOTES:
 *   - Passwords are NEVER stored in plaintext: scrypt-hashed with a per-user
 *     random salt (node:crypto).
 *   - The demo seed password below is an intentionally published demo
 *     credential for evaluation of the prototype — it is not a secret and
 *     must be replaced by an identity provider in production.
 *   - `toPublicUser()` strips all credential material before any user data
 *     leaves the server.
 */

import crypto from 'node:crypto';
import { MOCK_USERS } from '@/data/mockUsers';
import type { User, UserRole } from '@/types';

/** Internal user record — includes credential material, never leaves the server. */
interface StoredUser extends User {
  passwordHash: string;
  passwordSalt: string;
  accountStatus: 'ACTIVE' | 'DISABLED';
  createdAt: string;
}

/** Public projection of a user — safe to serialize to clients. */
export type PublicUser = User;

/**
 * Published demo password for the three seeded demo personas.
 * Clearly a PROTOTYPE convenience — NOT a production credential.
 * (Rendered on the login page's demo-access panel.)
 */
export const DEMO_PASSWORD = 'Bhu-Verify#2024';

const inMemoryUsers = new Map<string, StoredUser>();

// ── Password hashing helpers (scrypt, no external deps) ──────────────────────

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function makeSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const candidate = hashPassword(password, salt);
  const a = Buffer.from(candidate, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ── Seed the store with the existing demo personas ───────────────────────────

function seed(): void {
  (['citizen', 'officer', 'admin'] as const).forEach((key) => {
    const base = MOCK_USERS[key];
    const salt = makeSalt();
    inMemoryUsers.set(base.id, {
      ...base,
      accountStatus: 'ACTIVE',
      createdAt: '2024-11-15T09:00:00.000Z',
      passwordSalt: salt,
      passwordHash: hashPassword(DEMO_PASSWORD, salt),
    });
  });
}
seed();

// ── Queries ──────────────────────────────────────────────────────────────────

export function findUserByEmail(email: string): StoredUser | null {
  const target = email.trim().toLowerCase();
  for (const user of inMemoryUsers.values()) {
    if (user.email.toLowerCase() === target) return user;
  }
  return null;
}

export function findUserById(id: string): StoredUser | null {
  return inMemoryUsers.get(id) ?? null;
}

/** All users (public projection, newest first). */
export function listUsers(): PublicUser[] {
  return [...inMemoryUsers.values()]
    .map(toPublicUser)
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

/** Strip credential material — the ONLY way user records leave this module. */
export function toPublicUser(user: StoredUser): PublicUser {
  const { passwordHash: _ph, passwordSalt: _ps, ...publicUser } = user;
  return publicUser;
}

// ── Mutations ────────────────────────────────────────────────────────────────

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone: string;
}

export type RegisterResult =
  | { ok: true; user: PublicUser }
  | { ok: false; error: 'EMAIL_TAKEN' | 'INVALID_INPUT' };

/**
 * Registers a new CITIZEN account (self-registration is citizen-only;
 * officer/admin accounts are provisioned administratively).
 */
export function registerUser(input: RegisterInput): RegisterResult {
  const name = input.name?.trim() ?? '';
  const email = input.email?.trim().toLowerCase() ?? '';
  const phone = input.phone?.trim() ?? '';

  if (name.length < 2 || name.length > 80) return { ok: false, error: 'INVALID_INPUT' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return { ok: false, error: 'INVALID_INPUT' };
  if (!/^[+\d][\d\s-]{5,20}$/.test(phone)) return { ok: false, error: 'INVALID_INPUT' };
  if (typeof input.password !== 'string' || input.password.length < 8 || input.password.length > 128) {
    return { ok: false, error: 'INVALID_INPUT' };
  }
  if (findUserByEmail(email)) return { ok: false, error: 'EMAIL_TAKEN' };

  const salt = makeSalt();
  const id = `usr-cit-${crypto.randomBytes(4).toString('hex')}`;
  const stored: StoredUser = {
    id,
    name,
    email,
    role: 'CITIZEN' as UserRole,
    phone,
    aadhaarOrGovId: 'PENDING-KYC',
    accountStatus: 'ACTIVE',
    createdAt: new Date().toISOString(),
    passwordSalt: salt,
    passwordHash: hashPassword(input.password, salt),
  };
  inMemoryUsers.set(id, stored);
  return { ok: true, user: toPublicUser(stored) };
}

/** Result of a credential check. */
export type CredentialCheckResult =
  | { ok: true; user: StoredUser }
  | { ok: false; error: 'INVALID_CREDENTIALS' | 'ACCOUNT_DISABLED' };

export function checkCredentials(email: string, password: string): CredentialCheckResult {
  const user = findUserByEmail(email);
  if (!user) {
    // Burn a hash even for unknown users to avoid trivially timing their existence.
    hashPassword(password, 'decoysalt');
    return { ok: false, error: 'INVALID_CREDENTIALS' };
  }
  if (!verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    return { ok: false, error: 'INVALID_CREDENTIALS' };
  }
  if (user.accountStatus === 'DISABLED') return { ok: false, error: 'ACCOUNT_DISABLED' };
  return { ok: true, user };
}

export type UpdateUserResult =
  | { ok: true; user: PublicUser; changes: { field: 'role' | 'accountStatus'; previous: string; next: string }[] }
  | { ok: false; error: 'NOT_FOUND' | 'INVALID_INPUT' | 'SELF_MODIFICATION' | 'ADMIN_PROTECTED' };

/**
 * Administrative role / status change with business-rule enforcement:
 *  - an administrator cannot modify their own account (prevents self-lockout)
 *  - other ADMIN accounts are protected from modification
 */
export function updateUserAccount(
  targetId: string,
  actorId: string,
  patch: { role?: UserRole; accountStatus?: 'ACTIVE' | 'DISABLED' },
): UpdateUserResult {
  const target = inMemoryUsers.get(targetId);
  if (!target) return { ok: false, error: 'NOT_FOUND' };
  if (targetId === actorId) return { ok: false, error: 'SELF_MODIFICATION' };
  if (target.role === 'ADMIN') return { ok: false, error: 'ADMIN_PROTECTED' };

  const changes: { field: 'role' | 'accountStatus'; previous: string; next: string }[] = [];

  if (patch.role && patch.role !== target.role) {
    if (!['CITIZEN', 'OFFICER', 'ADMIN'].includes(patch.role)) return { ok: false, error: 'INVALID_INPUT' };
    changes.push({ field: 'role', previous: target.role, next: patch.role });
    target.role = patch.role;
  }
  if (patch.accountStatus && patch.accountStatus !== target.accountStatus) {
    if (!['ACTIVE', 'DISABLED'].includes(patch.accountStatus)) return { ok: false, error: 'INVALID_INPUT' };
    changes.push({ field: 'accountStatus', previous: target.accountStatus, next: patch.accountStatus });
    target.accountStatus = patch.accountStatus;
  }

  return { ok: true, user: toPublicUser(target), changes };
}

/** Count of accounts (used by diagnostics). */
export function userCount(): number {
  return inMemoryUsers.size;
}
