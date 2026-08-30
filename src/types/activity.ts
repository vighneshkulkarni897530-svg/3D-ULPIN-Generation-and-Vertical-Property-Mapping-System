/**
 * Activity Data Types
 * ====================
 * Types for the unified activity feed that tracks every significant
 * event across the cadastre platform.
 */

/** Categories of activity that can appear in the feed. */
export type ActivityType =
  | 'PROPERTY_VERIFICATION'
  | 'CONFLICT_DETECTION'
  | 'CONFLICT_RESOLUTION'
  | 'CONFLICT_FIELD_REVIEW'
  | 'CONFLICT_CORRECTION'
  | 'DATA_UPDATE'
  | 'BUILDING_UPDATE'
  | 'AI_EXTRACTION'
  | '3D_RECONSTRUCTION'
  | 'WORKFLOW_TASK';

/** The type of entity an activity record refers to. */
export type ActivityEntityType =
  | 'PROPERTY'
  | 'PARCEL'
  | 'BUILDING'
  | 'FLOOR'
  | 'CONFLICT'
  | 'VERIFICATION'
  | 'TASK'
  | 'SYSTEM';

/** Status of the activity. */
export type ActivityStatus = 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'FAILED';

/**
 * A single activity record in the unified activity feed.
 *
 * Activities are appended automatically when verification status changes,
 * conflicts are detected or resolved, or data/AI/3D operations complete.
 */
export interface ActivityRecord {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  entityType: ActivityEntityType;
  entityId: string;
  /** ISO timestamp. */
  timestamp: string;
  /** Name of the user / agent that triggered the activity. */
  user: string;
  /** Role of the user (OFFICER / CITIZEN / ADMIN / SYSTEM / AI_AGENT). */
  userRole: string;
  status: ActivityStatus;
  /** Optional structured metadata for the activity. */
  metadata?: Record<string, unknown>;
}
