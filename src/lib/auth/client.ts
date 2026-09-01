/**
 * Client-side authentication API wrappers (Phase 10)
 * ===================================================
 * Thin fetch layer for the /api/auth/*, /api/users and /api/audit-log
 * endpoints. All calls are same-origin and rely on the httpOnly session
 * cookie — no tokens are ever stored in JavaScript.
 *
 * Errors are normalized to `AuthApiError` with the server's HTTP status so
 * pages can distinguish 400 (invalid input) / 401 (session expired) /
 * 403 (forbidden) / 429 (rate limited).
 */

export class AuthApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      credentials: 'same-origin',
    });
  } catch {
    throw new AuthApiError(0, 'NETWORK_ERROR', 'Cannot reach the authentication service. Check your connection.');
  }

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    // non-JSON body — fall through
  }

  if (!res.ok) {
    const err = (payload as { error?: { code?: string; message?: string } } | null)?.error;
    throw new AuthApiError(res.status, err?.code ?? 'UNKNOWN', err?.message ?? `Request failed (${res.status}).`);
  }
  return payload as T;
}

// ── Types shared with pages ──────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: 'CITIZEN' | 'OFFICER' | 'ADMIN';
  phone: string;
  aadhaarOrGovId: string;
  avatarUrl?: string;
  department?: string;
  designation?: string;
  jurisdictionDistrict?: string;
  badgeNumber?: string;
  accountStatus?: 'ACTIVE' | 'DISABLED';
  createdAt?: string;
  sessionExpiresAt?: number;
  authMethod?: string;
}

export interface ManagedUser extends Omit<SessionUser, 'sessionExpiresAt' | 'authMethod'> {}

export interface AuditRecordClient {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: 'CITIZEN' | 'OFFICER' | 'ADMIN' | string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: string;
  newValue?: string;
  details?: string;
  ipAddressMasked: string;
  timestamp: string;
}

// ── Auth endpoints ───────────────────────────────────────────────────────────

export function apiLogin(email: string, password: string, rememberMe = false): Promise<{ user: SessionUser }> {
  return request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password, rememberMe }) });
}

export function apiRegister(input: { name: string; email: string; phone: string; password: string }): Promise<{ user: SessionUser }> {
  return request('/api/auth/register', { method: 'POST', body: JSON.stringify(input) });
}

/** Response of POST /api/auth/forgot-password (generic — no account leakage). */
export interface ForgotPasswordResult {
  ok: boolean;
  deliveryMethod: 'none';
  message: string;
  /** Development-only: present when email delivery is unconfigured (dev builds). */
  devMode?: boolean;
  devResetToken?: string;
  devExpiresAt?: string;
  devNote?: string;
}

export function apiForgotPassword(email: string): Promise<ForgotPasswordResult> {
  return request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
}

export function apiResetPassword(token: string, password: string): Promise<{ ok: boolean }> {
  return request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });
}

export function apiDemoLogin(role: 'citizen' | 'officer' | 'admin'): Promise<{ user: SessionUser }> {
  return request('/api/auth/demo-login', { method: 'POST', body: JSON.stringify({ role }) });
}

export function apiLogout(): Promise<{ ok: boolean }> {
  return request('/api/auth/logout', { method: 'POST' });
}

/** Returns the session user, or null when unauthenticated (401). */
export async function apiGetSession(): Promise<{ user: SessionUser; expiresAt: string } | null> {
  try {
    return await request<{ user: SessionUser; expiresAt: string }>('/api/auth/session');
  } catch (err) {
    if (err instanceof AuthApiError && err.status === 401) return null;
    throw err;
  }
}

// ── Admin: user management ───────────────────────────────────────────────────

export function apiListUsers(): Promise<{ users: ManagedUser[] }> {
  return request('/api/users');
}

export function apiUpdateUser(
  id: string,
  patch: { role?: 'CITIZEN' | 'OFFICER' | 'ADMIN'; accountStatus?: 'ACTIVE' | 'DISABLED' },
): Promise<{ user: ManagedUser; changes: { field: string; previous: string; next: string }[] }> {
  return request(`/api/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

// ── Admin: audit log + client-side audit reporting ──────────────────────────

export function apiGetAuditLog(params?: { action?: string; entityType?: string; limit?: number }): Promise<{ records: AuditRecordClient[]; count: number }> {
  const qs = new URLSearchParams();
  if (params?.action) qs.set('action', params.action);
  if (params?.entityType) qs.set('entityType', params.entityType);
  if (params?.limit) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return request(`/api/audit-log${suffix}`);
}

/**
 * Fire-and-forget audit reporting for actions performed in the client app
 * (verification updates, conflict changes, workflow actions…). Never throws —
 * audit reporting must never break the primary user action.
 */
export function reportAudit(input: {
  action: 'PROPERTY_UPDATED' | 'VERIFICATION_UPDATED' | 'CONFLICT_UPDATED' | 'WORKFLOW_ACTION' | 'DISPUTE_SUBMITTED' | 'FIELD_VERIFICATION_REQUESTED' | 'ADMIN_ACTION';
  entityType: 'PROPERTY' | 'VERIFICATION' | 'CONFLICT' | 'WORKFLOW_TASK' | 'DISPUTE' | 'FIELD_VERIFICATION' | 'SYSTEM';
  entityId: string;
  previousValue?: string;
  newValue?: string;
  details?: string;
}): void {
  void request('/api/audit-log', { method: 'POST', body: JSON.stringify(input) }).catch(() => undefined);
}
