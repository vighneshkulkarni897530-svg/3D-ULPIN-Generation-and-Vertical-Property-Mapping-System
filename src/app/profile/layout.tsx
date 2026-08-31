'use client';

/** Route layout guard (Phase 10) — /profile requires an authenticated session. */
import { ProtectedRoute } from '@/components/auth/RouteGuards';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
