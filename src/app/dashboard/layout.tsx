'use client';

/**
 * Route layout guard (Phase 10) — /dashboard/**
 * Requires an authenticated session; unauthenticated visitors are redirected
 * to /auth/login?next=… Role-restricted children (admin/officer dashboards)
 * add their own RoleGuard layouts. The server re-checks authorization at the
 * API boundary — this guard shapes the UI, it is not the security control.
 */
import { ProtectedRoute } from '@/components/auth/RouteGuards';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
