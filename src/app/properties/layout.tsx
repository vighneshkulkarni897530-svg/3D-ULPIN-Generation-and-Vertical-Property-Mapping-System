'use client';

/**
 * Route layout guard (Phase 10) — /properties/**
  * Requires an authenticated session (see src/proxy.ts + RouteGuards).
 */
import { ProtectedRoute } from '@/components/auth/RouteGuards';

export default function PropertiesLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
