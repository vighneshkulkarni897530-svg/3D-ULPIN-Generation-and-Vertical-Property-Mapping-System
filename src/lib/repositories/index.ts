/**
 * Repository Layer — Phase 13
 * ============================
 * Server-side data-access layer that persists entities to Supabase (PostgreSQL
 * + PostGIS). Each repository wraps the server-side Supabase client (service-role
 * key) and maps between database rows (`Db*`) and application types (`@/types/*`).
 *
 * SECURITY: These modules must only be imported inside API route handlers or
 * server components. The service-role key bypasses Row Level Security.
 * Authorization is enforced server-side in the API routes via `requireAuth` /
 * `requirePermission`.
 */

export { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/server';
export { getBrowserSupabaseClient, isBrowserSupabaseAvailable } from '@/lib/supabase/client';
export type {
  DbUser,
  DbParcel,
  DbBuilding,
  DbFloor,
  DbPropertyUnit,
  DbPropertyItem,
  DbDemoSpatialId,
  DbVerification,
  DbConflict,
  DbWorkflowTask,
  DbNotification,
  DbAuditLog,
  DbDispute,
  DbFieldVerificationRequest,
  DbActivity,
} from '@/lib/supabase/types';

/** Pagination options for list queries. */
export interface ListOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  ascending?: boolean;
}

/** Standard CRUD result wrapper. */
export interface CrudResult<T> {
  data: T | null;
  error: Error | null;
}

/** List result with count. */
export interface ListResult<T> {
  data: T[];
  count: number | null;
  error: Error | null;
}

// ── Repository exports ───────────────────────────────────────────────────────
export { propertyUnitRepo, PropertyUnitRepository } from './propertyUnitRepository';
export { verificationRepo, VerificationRepository } from './verificationRepository';
export { conflictRepo, ConflictRepository } from './conflictRepository';
export { workflowRepo, WorkflowRepository } from './workflowRepository';
export { notificationRepo, NotificationRepository } from './notificationRepository';
export { disputeRepo, DisputeRepository } from './disputeRepository';
export { fieldVerificationRepo, FieldVerificationRepository } from './fieldVerificationRepository';
export { auditLogRepo, AuditLogRepository } from './auditRepository';
export { userRepository, UserRepository } from './userRepository';
export { gisRepo, GisRepository } from './gisRepository';
export { activityRepo, ActivityRepository } from './activityRepository';
export { demoSpatialIdRepo, DemoSpatialIdRepository } from './demoSpatialIdRepository';

// ── Db → App mappers (pure functions) ────────────────────────────────────────
export {
  asGeometry,
  mapParcel,
  mapBuilding,
  mapFloor,
  mapPropertyUnit,
  mapDemoSpatialId,
  mapVerification,
  mapConflict,
  mapActivity,
} from './mappers';
