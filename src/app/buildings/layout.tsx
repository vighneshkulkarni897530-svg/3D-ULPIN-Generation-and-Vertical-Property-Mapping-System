'use client';

/** Route layout guard (Phase 10) — /buildings/** requires an authenticated session. */
import { ProtectedRoute } from '@/components/auth/RouteGuards';

export default function BuildingsLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
