'use client';

/** Route layout guard (Phase 10) — /workflow/** requires an authenticated session. */
import { ProtectedRoute } from '@/components/auth/RouteGuards';

export default function WorkflowLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
