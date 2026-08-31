'use client';

/** Route layout guard (Phase 10) — /conflicts/** requires an authenticated session. */
import { ProtectedRoute } from '@/components/auth/RouteGuards';

export default function ConflictsLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
