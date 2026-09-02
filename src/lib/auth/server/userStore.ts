/**
 * Persistent User Store — SERVER-ONLY
 * =====================================
 * Backed by durable disk storage (`data/users.json` + `.next/cache` backup),
 * in-memory caching across dev reloads via `globalThis`, and optional Firebase
 * Realtime Database (RTDB) sync.
 *
 * Core Guarantees:
 *   - Users are saved permanently until explicitly removed by an Administrator.
 *   - Survives Next.js server restarts, development rebuilds, and browser reloads.
 *   - Passwords are scrypt-hashed with per-user random salt (node:crypto).
 *   - When an account is deleted by an admin, its ID is registered in a tombstone
 *     index so any active sessions or tokens for that user are immediately revoked.
 */

import crypto from 'node:crypto';
import fs from 'fs';
import path from 'path';
import { MOCK_USERS } from '@/data/mockUsers';
import type { User, UserRole } from '@/types';

/** Internal user record — includes credential material, never leaves the server. */
export interface StoredUser extends User {
  passwordHash?: string;
  passwordSalt?: string;
  accountStatus: 'ACTIVE' | 'DISABLED';
  createdAt: string;
  lastLoginAt?: string;
}

/** Public projection of a user — safe to serialize to clients. */
export type PublicUser = User;

/**
 * Published demo password for the seeded demo personas.
 */
export const DEMO_PASSWORD = 'Bhu-Verify#2024';

const RTDB_URL =
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
  'https://d-ulpin-de274-default-rtdb.firebaseio.com/';

// ── Global Memory Store (survives dev HMR) ──────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __GLOBAL_SPV_USER_STORE: Map<string, StoredUser> | undefined;
  // eslint-disable-next-line no-var
  var __GLOBAL_SPV_DELETED_USERS: Set<string> | undefined;
}

const inMemoryUsers: Map<string, StoredUser> =
  globalThis.__GLOBAL_SPV_USER_STORE || new Map<string, StoredUser>();
globalThis.__GLOBAL_SPV_USER_STORE = inMemoryUsers;

const deletedUserIds: Set<string> =
  globalThis.__GLOBAL_SPV_DELETED_USERS || new Set<string>();
globalThis.__GLOBAL_SPV_DELETED_USERS = deletedUserIds;

// ── Disk Storage Helpers ─────────────────────────────────────────────────────

interface DiskPayload {
  users: StoredUser[];
  deletedIds: string[];
}

function getPrimaryDataFilePath(): string {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }
  return path.join(dir, 'users.json');
}

function getBackupCacheFilePath(): string {
  const dir = path.join(process.cwd(), '.next', 'cache');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }
  return path.join(dir, 'spv_users_store.json');
}

function readDiskUsers(): DiskPayload {
  const primaryPath = path.join(process.cwd(), 'data', 'users.json');
  try {
    if (fs.existsSync(/*turbopackIgnore: true*/ primaryPath)) {
      const raw = fs.readFileSync(/*turbopackIgnore: true*/ primaryPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return { users: parsed, deletedIds: [] };
      }
      if (parsed && Array.isArray(parsed.users)) {
        return {
          users: parsed.users,
          deletedIds: Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [],
        };
      }
    }
  } catch (err) {
    console.warn(`[UserStore] Notice reading primary users file:`, err);
  }

  const backupPath = path.join(process.cwd(), '.next', 'cache', 'spv_users_store.json');
  try {
    if (fs.existsSync(/*turbopackIgnore: true*/ backupPath)) {
      const raw = fs.readFileSync(/*turbopackIgnore: true*/ backupPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.users)) {
        return {
          users: parsed.users,
          deletedIds: Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [],
        };
      }
    }
  } catch {}

  return { users: [], deletedIds: [] };
}

function writeDiskUsers(): void {
  const payload: DiskPayload = {
    users: [...inMemoryUsers.values()],
    deletedIds: [...deletedUserIds],
  };
  const jsonStr = JSON.stringify(payload, null, 2);

  try {
    const primaryPath = path.join(process.cwd(), 'data', 'users.json');
    fs.writeFileSync(/*turbopackIgnore: true*/ primaryPath, jsonStr, 'utf8');
  } catch {}

  try {
    const backupPath = path.join(process.cwd(), '.next', 'cache', 'spv_users_store.json');
    fs.writeFileSync(/*turbopackIgnore: true*/ backupPath, jsonStr, 'utf8');
  } catch {}
}

// ── Password hashing helpers ────────────────────────────────────────────────

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

// ── RTDB synchronization helpers ────────────────────────────────────────────

function sanitizeRtdbKey(key: string): string {
  return key.replace(/[.#$[\]]/g, '_');
}

async function syncUserToRtdbSafe(user: StoredUser): Promise<void> {
  try {
    const cleanUrl = RTDB_URL.replace(/\/+$/, '');
    const rtdbKey = sanitizeRtdbKey(user.id);
    await fetch(`${cleanUrl}/users/${rtdbKey}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        accountStatus: user.accountStatus,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt || new Date().toISOString(),
      }),
    }).catch(() => {});
  } catch {}
}

async function deleteUserFromRtdbSafe(id: string): Promise<void> {
  try {
    const cleanUrl = RTDB_URL.replace(/\/+$/, '');
    const rtdbKey = sanitizeRtdbKey(id);
    await fetch(`${cleanUrl}/users/${rtdbKey}.json`, {
      method: 'DELETE',
    }).catch(() => {});
  } catch {}
}

// ── Initialization & Seeding ────────────────────────────────────────────────

function initUserStore(): void {
  // 1. Load persisted users from disk
  const disk = readDiskUsers();
  if (disk.deletedIds?.length) {
    disk.deletedIds.forEach((id) => deletedUserIds.add(id));
  }

  disk.users.forEach((user) => {
    if (!deletedUserIds.has(user.id)) {
      inMemoryUsers.set(user.id, user);
    }
  });

  // 2. Ensure seed personas exist (unless explicitly deleted)
  (['citizen', 'officer', 'admin'] as const).forEach((key) => {
    const base = MOCK_USERS[key];
    if (!deletedUserIds.has(base.id) && !inMemoryUsers.has(base.id)) {
      const salt = makeSalt();
      inMemoryUsers.set(base.id, {
        ...base,
        accountStatus: 'ACTIVE',
        createdAt: '2024-11-15T09:00:00.000Z',
        passwordSalt: salt,
        passwordHash: hashPassword(DEMO_PASSWORD, salt),
      });
    }
  });

  // Persist current state
  writeDiskUsers();
}

initUserStore();

// ── Public Queries ──────────────────────────────────────────────────────────

export function isUserDeleted(idOrEmail: string): boolean {
  if (deletedUserIds.has(idOrEmail)) return true;
  for (const user of inMemoryUsers.values()) {
    if (user.email.toLowerCase() === idOrEmail.toLowerCase() && deletedUserIds.has(user.id)) {
      return true;
    }
  }
  return false;
}

export function findUserByEmail(email: string): StoredUser | null {
  const target = email.trim().toLowerCase();
  for (const user of inMemoryUsers.values()) {
    if (user.email.toLowerCase() === target) {
      if (deletedUserIds.has(user.id)) return null;
      return user;
    }
  }
  return null;
}

export function findUserById(id: string): StoredUser | null {
  if (deletedUserIds.has(id)) return null;
  return inMemoryUsers.get(id) ?? null;
}

/** All active/stored users (public projection, newest first). */
export function listUsers(): PublicUser[] {
  return [...inMemoryUsers.values()]
    .filter((u) => !deletedUserIds.has(u.id))
    .map(toPublicUser)
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

/** Strip credential material before returning to client. */
export function toPublicUser(user: StoredUser): PublicUser {
  const { passwordHash: _ph, passwordSalt: _ps, ...publicUser } = user;
  return publicUser;
}

// ── Upsert & Persistence ────────────────────────────────────────────────────

export interface UpsertUserInput {
  id?: string;
  email: string;
  name?: string;
  phone?: string;
  role?: UserRole;
  password?: string;
  aadhaarOrGovId?: string;
  avatarUrl?: string;
  department?: string;
  designation?: string;
  jurisdictionDistrict?: string;
  badgeNumber?: string;
}

/**
 * Saves or updates a user upon login/registration.
 * Preserves role and status if previously updated by admin.
 */
export function upsertUser(input: UpsertUserInput): StoredUser {
  const normEmail = input.email.trim().toLowerCase();
  let existing = findUserByEmail(normEmail) || (input.id ? findUserById(input.id) : null);

  // If this ID was previously marked deleted but re-registered/re-created, un-delete it
  if (input.id && deletedUserIds.has(input.id)) {
    deletedUserIds.delete(input.id);
  }

  const now = new Date().toISOString();
  let stored: StoredUser;

  if (existing) {
    stored = {
      ...existing,
      id: input.id || existing.id,
      name: input.name?.trim() || existing.name,
      email: normEmail,
      phone: input.phone?.trim() || existing.phone || '',
      aadhaarOrGovId: input.aadhaarOrGovId || existing.aadhaarOrGovId || 'PENDING-KYC',
      avatarUrl: input.avatarUrl || existing.avatarUrl,
      department: input.department || existing.department,
      designation: input.designation || existing.designation,
      jurisdictionDistrict: input.jurisdictionDistrict || existing.jurisdictionDistrict,
      badgeNumber: input.badgeNumber || existing.badgeNumber,
      // Preserve role and status unless explicitly supplied
      role: input.role || existing.role || 'CITIZEN',
      accountStatus: existing.accountStatus || 'ACTIVE',
      lastLoginAt: now,
    };

    if (input.password) {
      const salt = makeSalt();
      stored.passwordSalt = salt;
      stored.passwordHash = hashPassword(input.password, salt);
    }
  } else {
    const id = input.id || `usr-cit-${crypto.randomBytes(4).toString('hex')}`;
    const salt = makeSalt();

    stored = {
      id,
      name: input.name?.trim() || normEmail.split('@')[0] || 'Cadastre User',
      email: normEmail,
      role: input.role || 'CITIZEN',
      phone: input.phone?.trim() || '',
      aadhaarOrGovId: input.aadhaarOrGovId || 'PENDING-KYC',
      accountStatus: 'ACTIVE',
      createdAt: now,
      lastLoginAt: now,
      avatarUrl: input.avatarUrl,
      department: input.department,
      designation: input.designation,
      jurisdictionDistrict: input.jurisdictionDistrict,
      badgeNumber: input.badgeNumber,
      passwordSalt: salt,
      passwordHash: input.password ? hashPassword(input.password, salt) : hashPassword(DEMO_PASSWORD, salt),
    };
  }

  inMemoryUsers.set(stored.id, stored);
  writeDiskUsers();
  void syncUserToRtdbSafe(stored);

  return stored;
}

// ── Mutations ────────────────────────────────────────────────────────────────

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  aadhaarOrGovId?: string;
}

export type RegisterResult =
  | { ok: true; user: PublicUser }
  | { ok: false; error: 'EMAIL_TAKEN' | 'INVALID_INPUT' };

export function registerUser(input: RegisterInput): RegisterResult {
  const name = input.name?.trim() ?? '';
  const email = input.email?.trim().toLowerCase() ?? '';
  const phone = input.phone?.trim() ?? '';
  const aadhaarOrGovId = input.aadhaarOrGovId?.trim() || 'PENDING-KYC';

  if (name.length < 2 || name.length > 80) return { ok: false, error: 'INVALID_INPUT' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return { ok: false, error: 'INVALID_INPUT' };
  if (phone && !/^[+\d][\d\s-]{5,20}$/.test(phone)) return { ok: false, error: 'INVALID_INPUT' };
  if (typeof input.password !== 'string' || input.password.length < 6 || input.password.length > 128) {
    return { ok: false, error: 'INVALID_INPUT' };
  }

  if (findUserByEmail(email)) return { ok: false, error: 'EMAIL_TAKEN' };

  const storedUser = upsertUser({
    name,
    email,
    password: input.password,
    phone,
    aadhaarOrGovId,
    role: 'CITIZEN',
  });

  return { ok: true, user: toPublicUser(storedUser) };
}

export type CredentialCheckResult =
  | { ok: true; user: StoredUser }
  | { ok: false; error: 'INVALID_CREDENTIALS' | 'ACCOUNT_DISABLED' };

export function checkCredentials(email: string, password: string): CredentialCheckResult {
  const user = findUserByEmail(email);
  if (!user) {
    hashPassword(password, 'decoysalt');
    return { ok: false, error: 'INVALID_CREDENTIALS' };
  }
  if (user.passwordSalt && user.passwordHash) {
    if (!verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      return { ok: false, error: 'INVALID_CREDENTIALS' };
    }
  } else {
    // Demo password fallback
    if (password !== DEMO_PASSWORD) {
      return { ok: false, error: 'INVALID_CREDENTIALS' };
    }
  }
  if (user.accountStatus === 'DISABLED') return { ok: false, error: 'ACCOUNT_DISABLED' };
  return { ok: true, user };
}

export function updateUserPassword(
  email: string,
  newPassword: string
): { ok: true; user: StoredUser } | { ok: false; error: string } {
  const normEmail = email.trim().toLowerCase();
  let user = findUserByEmail(normEmail);

  const salt = makeSalt();
  const hash = hashPassword(newPassword, salt);

  if (user) {
    user.passwordSalt = salt;
    user.passwordHash = hash;
    user.lastLoginAt = new Date().toISOString();
    inMemoryUsers.set(user.id, user);
    writeDiskUsers();
    void syncUserToRtdbSafe(user);
    return { ok: true, user };
  } else {
    const created = upsertUser({
      email: normEmail,
      name: normEmail.split('@')[0] || 'Cadastre User',
      password: newPassword,
      role: 'CITIZEN',
    });
    return { ok: true, user: created };
  }
}

export type UpdateUserResult =
  | { ok: true; user: PublicUser; changes: { field: 'role' | 'accountStatus'; previous: string; next: string }[] }
  | { ok: false; error: 'NOT_FOUND' | 'INVALID_INPUT' | 'SELF_MODIFICATION' | 'ADMIN_PROTECTED' };

export function updateUserAccount(
  targetId: string,
  actorId: string,
  patch: { role?: UserRole; accountStatus?: 'ACTIVE' | 'DISABLED' },
): UpdateUserResult {
  const target = inMemoryUsers.get(targetId);
  if (!target || deletedUserIds.has(targetId)) return { ok: false, error: 'NOT_FOUND' };
  if (targetId === actorId) return { ok: false, error: 'SELF_MODIFICATION' };
  if (target.role === 'ADMIN' && actorId !== 'usr-adm-303' && target.id !== actorId) {
    return { ok: false, error: 'ADMIN_PROTECTED' };
  }

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

  writeDiskUsers();
  void syncUserToRtdbSafe(target);

  return { ok: true, user: toPublicUser(target), changes };
}

// ── Admin User Removal ───────────────────────────────────────────────────────

export type DeleteUserResult =
  | { ok: true; user: PublicUser }
  | { ok: false; error: 'NOT_FOUND' | 'SELF_MODIFICATION' | 'ADMIN_PROTECTED' };

/**
 * Permanently removes a user account from the system.
 * Enforces self-lockout protection and protects the root admin.
 */
export function deleteUserAccount(targetId: string, actorId: string): DeleteUserResult {
  const target = inMemoryUsers.get(targetId);
  if (!target || deletedUserIds.has(targetId)) {
    return { ok: false, error: 'NOT_FOUND' };
  }

  // Cannot delete yourself
  if (targetId === actorId) {
    return { ok: false, error: 'SELF_MODIFICATION' };
  }

  // Root admin cannot be deleted
  if (
    target.id === 'usr-adm-303' ||
    target.email.toLowerCase() === 'admin.cadastre@gov.in'
  ) {
    return { ok: false, error: 'ADMIN_PROTECTED' };
  }

  // Protect other admins from being deleted by non-root admins
  if (target.role === 'ADMIN' && actorId !== 'usr-adm-303') {
    return { ok: false, error: 'ADMIN_PROTECTED' };
  }

  // Remove from memory
  inMemoryUsers.delete(targetId);
  // Add to deleted tombstone index
  deletedUserIds.add(targetId);

  // Persist update
  writeDiskUsers();
  void deleteUserFromRtdbSafe(targetId);

  console.log(`[UserStore] User ${target.name} (${target.email}, id: ${targetId}) was permanently removed by admin ${actorId}.`);

  return { ok: true, user: toPublicUser(target) };
}

export function userCount(): number {
  return inMemoryUsers.size;
}
