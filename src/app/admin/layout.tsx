'use client';

/**
 * Route layout guard (Phase 10) — /admin/** requires ADMIN.
 * The exact permission (USER_MANAGEMENT / VIEW_ACTIVITY_LOG / SYSTEM_ADMIN)
 * is resolved per-path from the centralized route map inside RoleGuard.
 */
import { RoleGuard } from '@/components/auth/RouteGuards';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard permission={null}>{children}</RoleGuard>;
}
