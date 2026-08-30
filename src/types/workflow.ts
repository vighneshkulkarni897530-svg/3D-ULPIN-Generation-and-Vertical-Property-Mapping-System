/**
 * Workflow & Task Management Types (Phase 9)
 * ============================================
 * Types for the centralized task/workflow system built on top of the unified
 * GIS registry. Tasks REFERENCE GIS entities (properties, conflicts, parcels,
 * buildings) by id — they never duplicate registry data.
 *
 * The task store lives in WorkflowContext and is the single source of truth
 * for task state. Audit records are emitted through the existing centralized
 * activity system (ActivityType WORKFLOW_TASK) and notifications flow through
 * the existing PropertyContext notification store.
 */
import type { UserRole } from './index';

export type TaskStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'UNDER_REVIEW'
  | 'COMPLETED'
  | 'CANCELLED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TaskEntityType =
  | 'PROPERTY'
  | 'CONFLICT'
  | 'FIELD_VERIFICATION'
  | 'REINSPECTION'
  | 'DATA_REVIEW'
  | 'BUILDING'
  | 'PARCEL'
  | 'FLOOR';

export const TASK_STATUSES: TaskStatus[] = [
  'PENDING',
  'ASSIGNED',
  'IN_PROGRESS',
  'UNDER_REVIEW',
  'COMPLETED',
  'CANCELLED',
];

export const TASK_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const TASK_ENTITY_LABELS: Record<TaskEntityType, string> = {
  PROPERTY: 'Property',
  CONFLICT: 'Spatial Conflict',
  FIELD_VERIFICATION: 'Field Verification',
  REINSPECTION: 'Re-inspection',
  DATA_REVIEW: 'Data Review',
  BUILDING: 'Building',
  PARCEL: 'Land Parcel',
  FLOOR: 'Floor',
};

/** A single step in a task's history / audit trail. */
export interface TaskHistoryEvent {
  id: string;
  timestamp: string; // ISO
  actor: string;
  actorRole: UserRole | 'SYSTEM';
  action: string;
  note?: string;
}

export interface WorkflowTask {
  id: string; // e.g. TASK-001
  title: string;
  description: string;
  entityType: TaskEntityType;
  entityId: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string; // ISO
  dueDate?: string; // ISO
  completedAt?: string; // ISO
  history: TaskHistoryEvent[];
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  entityType: TaskEntityType;
  entityId: string;
  priority: TaskPriority;
  dueDate?: string;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  createdBy: string; // name
  createdByName: string;
  note?: string;
}

/** Simulated collaboration presence — NOT real-time WebSockets. */
export type PresenceStatus = 'ACTIVE' | 'AWAY' | 'OFFLINE';

export interface Collaborator {
  id: string;
  name: string;
  designation: string;
  role: UserRole;
  status: PresenceStatus;
  lastSeen: string; // ISO
  badgeNumber?: string;
}