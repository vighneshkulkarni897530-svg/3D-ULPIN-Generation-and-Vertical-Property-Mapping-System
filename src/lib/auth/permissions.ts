/**
 * Centralized Permission & Route-Protection Utilities (Phase 10)
 * ================================================================
 *
 * SINGLE SOURCE OF TRUTH for:
 *   - role hierarchy (CITIZEN < OFFICER < ADMIN)
 *   - role → permission checks (`hasPermission`)
 *   - route → required-permission mapping (`canAccessPath`, `getRequiredPermission`)
 *
 * This module is intentionally PURE (no React, no Node APIs) so it can be
 * imported from client components, server route handlers AND middleware.
 *
 * ⚠ Client-side checks here shape the UI; authorization is ALWAYS re-checked
 *   at the server/API boundary (`src/lib/auth/server/apiAuth.ts`) using the
 *   session cookie — browser-supplied role values are never trusted.
 */

import { PERMISSIONS, ROLE_PERMISSIONS, type Permission } from '@/types/auth';
import type { UserRole } from '@/types';

export { PERMISSIONS };
export type { Permission };

/** Role rank — OFFICER inherits everything CITIZEN has, ADMIN everything OFFICER has. */
const ROLE_RANK: Record<UserRole, number> = {
  CITIZEN: 1,
  OFFICER: 2,
  ADMIN: 3,
};

/** Minimum role rank required for a given permission (derived from ROLE_PERMISSIONS). */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Officers and admins can do everything citizens can. */
export function hasMinRole(role: UserRole, min: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

// ─────────────────────────────────────────────────────────────────────────────
// Route protection map
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A route-protection rule. `permission: null` means "any authenticated user".
 * Rules are evaluated in order; the FIRST matching rule wins, so list the
 * most specific prefixes first.
 */
export interface RouteRule {
  /** Path prefix the rule applies to. */
  prefix: string;
  /** Required permission, or null for any authenticated user. */
  permission: Permission | null;
  /** Human-readable reason shown on the unauthorized page. */
  reason: string;
}

export const ROUTE_RULES: RouteRule[] = [
  // ── Admin (most specific first) ──
  { prefix: '/admin/users', permission: PERMISSIONS.USER_MANAGEMENT, reason: 'User management is restricted to system administrators.' },
  { prefix: '/admin/audit-log', permission: PERMISSIONS.VIEW_ACTIVITY_LOG, reason: 'The audit trail is restricted to system administrators.' },
  { prefix: '/admin', permission: PERMISSIONS.SYSTEM_ADMIN, reason: 'Administration is restricted to system administrators.' },
  { prefix: '/dashboard/admin', permission: PERMISSIONS.ACCESS_DASHBOARD_ADMIN, reason: 'The admin dashboard is restricted to system administrators.' },

  // ── Officer operations ──
  { prefix: '/verification/field', permission: PERMISSIONS.VIEW_FIELDSHEET, reason: 'Field verification sheets are restricted to verification officers.' },
  { prefix: '/verification', permission: PERMISSIONS.VIEW_VERIFICATION_QUEUE, reason: 'The verification queue is restricted to verification officers.' },
  { prefix: '/ai-extraction', permission: PERMISSIONS.RUN_SPATIAL_VALIDATION, reason: 'AI spatial extraction is restricted to verification officers.' },
  { prefix: '/dashboard/officer', permission: PERMISSIONS.VIEW_VERIFICATION_QUEUE, reason: 'The officer dashboard is restricted to government officers.' },

  // ── System administration ──
  { prefix: '/settings', permission: PERMISSIONS.SYSTEM_ADMIN, reason: 'System settings are restricted to administrators.' },

  // ── Authenticated-any (browse / citizen services / shared views) ──
  { prefix: '/dashboard', permission: null, reason: 'Sign in to view your dashboard.' },
  { prefix: '/properties', permission: PERMISSIONS.BROWSE_REGISTRY, reason: 'Sign in to browse the property registry.' },
  { prefix: '/buildings', permission: PERMISSIONS.BROWSE_REGISTRY, reason: 'Sign in to browse the building registry.' },
  { prefix: '/floors', permission: PERMISSIONS.BROWSE_REGISTRY, reason: 'Sign in to browse floors.' },
  { prefix: '/map', permission: PERMISSIONS.BROWSE_REGISTRY, reason: 'Sign in to open the 3D cadastre map.' },
  { prefix: '/profile', permission: null, reason: 'Sign in to view your profile.' },
  { prefix: '/notifications', permission: PERMISSIONS.VIEW_OWN_NOTIFICATIONS, reason: 'Sign in to view notifications.' },
  { prefix: '/reports', permission: PERMISSIONS.VIEW_REPORTS, reason: 'Sign in to view reports & analytics.' },
  { prefix: '/conflicts', permission: PERMISSIONS.BROWSE_REGISTRY, reason: 'Sign in to view spatial conflicts.' },
  { prefix: '/workflow', permission: PERMISSIONS.BROWSE_REGISTRY, reason: 'Sign in to view workflow tasks.' },
  { prefix: '/disputes', permission: null, reason: 'Sign in to access dispute services.' },
  { prefix: '/field-verification', permission: null, reason: 'Sign in to access field verification services.' },
];

/** Paths that never require authentication. */
export const PUBLIC_PREFIXES = ['/', '/auth', '/unauthorized'];

// ── Access decision helpers ──

/** Returns the first matching rule for a path, or null when no rule matches. */
export function getRouteRule(pathname: string): RouteRule | null {
  const path = (pathname || '/').split('?')[0];
  for (const rule of ROUTE_RULES) {
    if (path === rule.prefix || path.startsWith(`${rule.prefix}/`)) return rule;
  }
  return null;
}

/** True when the path is publicly accessible without a session. */
export function isPublicPath(pathname: string): boolean {
  const path = (pathname || '/').split('?')[0] || '/';
  return PUBLIC_PREFIXES.some((p) => path === p || (p !== '/' && path.startsWith(`${p}/`)));
}

/**
 * Full access decision for a path:
 *  - 'public'          → no session needed
 *  - 'allowed'         → authenticated + permitted
 *  - 'unauthenticated' → needs login
 *  - 'unauthorized'    → authenticated but missing the permission
 */
export type AccessDecision = 'public' | 'allowed' | 'unauthenticated' | 'unauthorized';

export function canAccessPath(pathname: string, role: UserRole | null): AccessDecision {
  if (isPublicPath(pathname)) return 'public';
  if (!role) return 'unauthenticated';
  const rule = getRouteRule(pathname);
  if (!rule) return 'allowed'; // authenticated → unknown pages default to allowed
  if (rule.permission === null) return 'allowed';
  return hasPermission(role, rule.permission) ? 'allowed' : 'unauthorized';
}

/** Convenience: the permission required for a path (null = any authenticated user). */
export function getRequiredPermission(pathname: string): Permission | null {
  return getRouteRule(pathname)?.permission ?? null;
}

/** Human-readable reason a path is protected (for the unauthorized page). */
export function getRouteRuleReason(pathname: string): string | null {
  return getRouteRule(pathname)?.reason ?? null;
}

/** Display label for roles used across the UI. */
export const ROLE_LABELS: Record<UserRole, string> = {
  CITIZEN: 'Verified Citizen',
  OFFICER: 'Government Officer',
  ADMIN: 'Cadastre Administrator',
};

/**
 * The Phase 10 role/permission matrix — documentation of record, rendered on
 * the profile page and mirrored in docs/PHASE10_AUTHENTICATION_SECURITY.md.
 */
export const PERMISSION_MATRIX: { feature: string; citizen: boolean; officer: boolean; admin: boolean }[] = [
  { feature: 'Property / Registry View', citizen: true, officer: true, admin: true },
  { feature: '3D Map', citizen: true, officer: true, admin: true },
  { feature: 'Building & Floor View', citizen: true, officer: true, admin: true },
  { feature: 'Verification Status View', citizen: true, officer: true, admin: true },
  { feature: 'Verification Update', citizen: false, officer: true, admin: true },
  { feature: 'Conflict View', citizen: true, officer: true, admin: true },
  { feature: 'Conflict Management', citizen: false, officer: true, admin: true },
  { feature: 'Workflow View', citizen: true, officer: true, admin: true },
  { feature: 'Workflow Management', citizen: false, officer: true, admin: true },
  { feature: 'Reports & Analytics', citizen: true, officer: true, admin: true },
  { feature: 'User Management', citizen: false, officer: false, admin: true },
  { feature: 'Audit Logs', citizen: false, officer: false, admin: true },
  { feature: 'System Administration', citizen: false, officer: false, admin: true },
];
