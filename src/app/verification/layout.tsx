'use client';

/** Route layout guard (Phase 10) — /verification/** requires OFFICER+ (route map). */
import { RoleGuard } from '@/components/auth/RouteGuards';

export default function VerificationLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard permission={null}>{children}</RoleGuard>;
}
