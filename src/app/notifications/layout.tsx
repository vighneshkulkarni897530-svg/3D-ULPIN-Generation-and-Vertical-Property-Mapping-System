'use client';

/** Route layout guard (Phase 10) — /notifications/** requires an authenticated session. */
import { ProtectedRoute } from '@/components/auth/RouteGuards';

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
