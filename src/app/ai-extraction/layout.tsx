'use client';

/** Route layout guard (Phase 10) — /ai-extraction/** requires OFFICER+ (route map). */
import { RoleGuard } from '@/components/auth/RouteGuards';

export default function AiExtractionLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard permission={null}>{children}</RoleGuard>;
}
