/**
 * Workflow helpers (Phase 9)
 * ===========================
 * Pure, reusable functions for the centralized task system: status
 * transitions, role guards and overdue logic. No state lives here — all
 * task state is owned by WorkflowContext.
 */
import type { UserRole } from '@/types';
import type { TaskEntityType, TaskStatus, WorkflowTask } from '@/types/workflow';
import { TASK_ENTITY_LABELS } from '@/types/workflow';

/** Terminal statuses — the task is closed and no longer actionable. */
export const TERMINAL_TASK_STATUSES: TaskStatus[] = ['COMPLETED', 'CANCELLED'];

export const isTaskOpen = (task: WorkflowTask): boolean =>
  !TERMINAL_TASK_STATUSES.includes(task.status);

export const isTaskOverdue = (task: WorkflowTask, now = Date.now()): boolean => {
  if (!task.dueDate || !isTaskOpen(task)) return false;
  return new Date(task.dueDate).getTime() < now;
};

export const isTaskDueSoon = (task: WorkflowTask, withinMs = 3 * 24 * 60 * 60 * 1000, now = Date.now()): boolean => {
  if (!task.dueDate || !isTaskOpen(task)) return false;
  const due = new Date(task.dueDate).getTime();
  return due >= now && due - now <= withinMs;
};

/** Allowed forward transitions for a task lifecycle. */
export const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  PENDING: ['ASSIGNED', 'IN_PROGRESS', 'CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'UNDER_REVIEW', 'CANCELLED'],
  IN_PROGRESS: ['UNDER_REVIEW', 'COMPLETED', 'CANCELLED'],
  UNDER_REVIEW: ['COMPLETED', 'IN_PROGRESS', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const canTransitionTo = (task: WorkflowTask, next: TaskStatus): boolean =>
  TASK_TRANSITIONS[task.status]?.includes(next) ?? false;

// ── Role guards (mirror the application's demo role model) ───────────────────

export const canCreateTask = (role: UserRole): boolean => role === 'ADMIN' || role === 'OFFICER';

export const canAssignTask = (role: UserRole): boolean =>
  role === 'ADMIN' || role === 'OFFICER';

export const canUpdateTaskStatus = (role: UserRole): boolean =>
  role === 'ADMIN' || role === 'OFFICER';

/** Officers may only reassign tasks assigned to themselves; admins assign freely. */
export const canReassignTask = (role: UserRole, task: WorkflowTask, currentUserName: string): boolean => {
  if (role === 'ADMIN') return true;
  if (role !== 'OFFICER') return false;
  return task.assignedOfficerName === currentUserName;
};

export const canOperateTask = (role: UserRole): boolean => role === 'ADMIN' || role === 'OFFICER';

// ── Labels / descriptions ─────────────────────────────────────────────────────

export const entityLabel = (type: TaskEntityType, entityId: string): string =>
  `${TASK_ENTITY_LABELS[type]} · ${entityId}`;

export const formatDueStatus = (task: WorkflowTask, now = Date.now()): string | null => {
  if (!task.dueDate || !isTaskOpen(task)) return null;
  if (isTaskOverdue(task, now)) return 'Overdue';
  if (isTaskDueSoon(task, 3 * 24 * 60 * 60 * 1000, now)) return 'Due soon';
  return 'On track';
};