'use client';

/** Route layout guard (Phase 10) — /field-verification/** requires an authenticated session. */
import { ProtectedRoute } from '@/components/auth/RouteGuards';

export default function FieldVerificationLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
