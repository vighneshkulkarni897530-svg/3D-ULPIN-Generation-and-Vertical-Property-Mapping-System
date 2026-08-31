'use client';

/** Route layout guard (Phase 10) — /settings/** requires ADMIN (route map). */
import { RoleGuard } from '@/components/auth/RouteGuards';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard permission={null}>{children}</RoleGuard>;
}
