'use client';

/** Route layout guard (Phase 10) — /floors/** requires an authenticated session. */
import { ProtectedRoute } from '@/components/auth/RouteGuards';

export default function FloorsLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
