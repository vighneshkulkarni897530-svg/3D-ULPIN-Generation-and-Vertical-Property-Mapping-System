'use client';

/** Route layout guard (Phase 10) — /disputes/** requires an authenticated session. */
import { ProtectedRoute } from '@/components/auth/RouteGuards';

export default function DisputesLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
