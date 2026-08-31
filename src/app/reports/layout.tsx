'use client';

/** Route layout guard (Phase 10) — /reports/** requires an authenticated session. */
import { ProtectedRoute } from '@/components/auth/RouteGuards';

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
