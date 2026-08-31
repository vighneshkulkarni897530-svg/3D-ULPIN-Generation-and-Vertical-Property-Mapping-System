'use client';

/** Route layout guard (Phase 10) — /map/** requires an authenticated session. */
import { ProtectedRoute } from '@/components/auth/RouteGuards';

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
