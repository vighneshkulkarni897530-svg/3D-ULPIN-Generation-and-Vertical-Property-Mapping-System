'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { UserRole } from '@/types';
import type { CreateNotificationInput } from '@/types';
import type { ActivityRecord } from '@/types/activity';
import type {
  Collaborator,
  CreateTaskInput,
  TaskEntityType,
  TaskHistoryEvent,
  TaskPriority,
  TaskStatus,
  WorkflowTask,
} from '@/types/workflow';
import { TASK_ENTITY_LABELS } from '@/types/workflow';
import { MOCK_COLLABORATORS, MOCK_WORKFLOW_TASKS } from '@/data/workflowTasks';
import { useGIS } from '@/context/GISContext';
import { useProperty } from '@/context/PropertyContext';
import { canTransitionTo, isTaskOpen, isTaskOverdue } from '@/lib/workflow';

/**
 * Centralized Workflow & Task store (Phase 9).
 * ==============================================
 * Single source of truth for task state. Tasks REFERENCE GIS registry
 * entities by id — no registry data is duplicated.
 *
 * Every task mutation:
 *   1. updates the task in this store,
 *   2. emits an audit ActivityRecord through the centralized GIS activity
 *      system (ActivityType WORKFLOW_TASK),
 *   3. emits a notification through the existing PropertyContext
 *      notification store (PlatformNotification type TASK).
 *
 * Collaboration presence is DEMO/SIMULATED — not real-time WebSockets.
 */

type ActorKind = UserRole | 'SYSTEM';

export interface EnsureTaskInput {
  entityType: TaskEntityType;
  entityId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  actorName?: string;
  actorRole?: ActorKind;
  note?: string;
}

export interface WorkflowContextType {
  tasks: WorkflowTask[];
  collaborators: Collaborator[];

  // ── Selectors ──
  getTask: (id: string) => WorkflowTask | undefined;
  taskForEntity: (entityType: TaskEntityType, entityId: string) => WorkflowTask | undefined;
  openTasks: WorkflowTask[];
  openCount: number;
  pendingCount: number;
  assignedCount: number;
  inProgressCount: number;
  underReviewCount: number;
  overdueCount: number;
  criticalOpenCount: number;
  completedCount: number;

  // ── Actions ──
  createTask: (input: CreateTaskInput) => WorkflowTask | null;
  ensureTaskForEntity: (input: EnsureTaskInput) => WorkflowTask | null;
  completeTaskForEntity: (
    entityType: TaskEntityType,
    entityId: string,
    actorName: string,
    actorRole: ActorKind,
    note?: string,
  ) => void;
  assignTask: (taskId: string, officerId: string, officerName: string, actorName: string, actorRole: ActorKind, note?: string) => boolean;
  updateTaskStatus: (taskId: string, nextStatus: TaskStatus, actorName: string, actorRole: ActorKind, note?: string) => boolean;
  addTaskNote: (taskId: string, note: string, actorName: string, actorRole: ActorKind) => boolean;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

let taskCounter = 6;
function nextTaskId(): string {
  taskCounter += 1;
  return `TASK-${String(taskCounter).padStart(3, '0')}`;
}

let eventCounter = 0;
function nextEventId(): string {
  eventCounter += 1;
  return `H-${Date.now()}-${eventCounter}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export const WorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<WorkflowTask[]>(MOCK_WORKFLOW_TASKS);
  const [collaborators] = useState<Collaborator[]>(MOCK_COLLABORATORS);

  const { addActivity } = useGIS();
  const { addNotification } = useProperty();

  // ── Derived selectors (computed live — never cached/hardcoded) ──
  const openTasks = tasks.filter(isTaskOpen);
  const openCount = openTasks.length;
  const pendingCount = tasks.filter((t) => t.status === 'PENDING').length;
  const assignedCount = tasks.filter((t) => t.status === 'ASSIGNED').length;
  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const underReviewCount = tasks.filter((t) => t.status === 'UNDER_REVIEW').length;
  const overdueCount = openTasks.filter((t) => isTaskOverdue(t)).length;
  const criticalOpenCount = openTasks.filter((t) => t.priority === 'CRITICAL').length;
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;

  // ── Internal helpers ──
  const emitAudit = useCallback(
    (task: WorkflowTask, action: string, actorName: string, actorRole: ActorKind, description: string, status: ActivityRecord['status'] = 'COMPLETED') => {
      addActivity({
        type: 'WORKFLOW_TASK',
        title: `${action} — ${task.id}`,
        description,
        entityType: 'TASK',
        entityId: task.id,
        timestamp: nowIso(),
        user: actorName,
        userRole: actorRole === 'SYSTEM' ? 'SYSTEM' : actorRole,
        status,
        metadata: {
          taskId: task.id,
          title: task.title,
          entityType: task.entityType,
          entityId: task.entityId,
          action,
        },
      });
    },
    [addActivity],
  );

  const emitNotification = useCallback(
    (input: CreateNotificationInput) => {
      addNotification(input);
    },
    [addNotification],
  );

  const appendHistory = (task: WorkflowTask, event: Omit<TaskHistoryEvent, 'id' | 'timestamp'>): TaskHistoryEvent => {
    const historyEvent: TaskHistoryEvent = {
      id: nextEventId(),
      timestamp: nowIso(),
      actor: event.actor,
      actorRole: event.actorRole,
      action: event.action,
      ...(event.note ? { note: event.note } : {}),
    };
    return historyEvent;
  };

  // ── Create task ──
  const createTask = useCallback(
    (input: CreateTaskInput): WorkflowTask | null => {
      if (!input.title.trim() || !input.entityId.trim()) return null;
      const hasAssignee = Boolean(input.assignedOfficerId && input.assignedOfficerName);
      const task: WorkflowTask = {
        id: nextTaskId(),
        title: input.title.trim(),
        description: input.description?.trim() ?? '',
        entityType: input.entityType,
        entityId: input.entityId.trim(),
        priority: input.priority,
        status: hasAssignee ? 'ASSIGNED' : 'PENDING',
        ...(hasAssignee
          ? { assignedOfficerId: input.assignedOfficerId, assignedOfficerName: input.assignedOfficerName }
          : {}),
        createdBy: input.createdBy,
        createdByName: input.createdByName,
        createdAt: nowIso(),
        ...(input.dueDate ? { dueDate: input.dueDate } : {}),
        history: [
          {
            id: nextEventId(),
            timestamp: nowIso(),
                        actor: input.createdByName,
            actorRole: (input.createdBy === 'SYSTEM' ? 'SYSTEM' : input.createdBy) as ActorKind,
            action: 'Task created',
            ...(input.note ? { note: input.note } : {}),
          },
        ],
      };
      setTasks((prev) => [task, ...prev]);
      emitAudit(
        task,
        'Task created',
        input.createdByName,
        (input.createdBy === 'SYSTEM' ? 'SYSTEM' : input.createdBy) as ActorKind,
        `${task.id} "${task.title}" created by ${input.createdByName} (${TASK_ENTITY_LABELS[task.entityType]} · ${task.entityId}).`,
        'PENDING',
      );
      emitNotification({
        recipientRole: hasAssignee ? 'OFFICER' : 'ALL',
        ...(hasAssignee ? { recipientUserId: input.assignedOfficerId } : {}),
        title: 'New task created',
        message: `${task.id} — ${task.title}${hasAssignee ? ` assigned to ${input.assignedOfficerName}` : ''}.`,
        type: 'TASK',
        priority: task.priority === 'CRITICAL' || task.priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
        linkUrl: `/workflow?task=${task.id}`,
      });
      return task;
    },
    [emitAudit, emitNotification],
  );

  // ── Idempotent entity-tied task creation (Part B integration) ──
  const ensureTaskForEntity = useCallback(
    (input: EnsureTaskInput): WorkflowTask | null => {
      const existing = tasks.find((t) => t.entityType === input.entityType && t.entityId === input.entityId && isTaskOpen(t));
      if (existing) {
        if (input.actorName) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === existing.id
                ? {
                    ...t,
                    history: [
                      ...t.history,
                      appendHistory(t, {
                        actor: input.actorName ?? 'SYSTEM',
                        actorRole: input.actorRole ?? 'SYSTEM',
                        action: 'Linked again (dedup)',
                        ...(input.note ? { note: input.note } : {}),
                      }),
                    ],
                  }
                : t,
            ),
          );
        }
        return existing;
      }
      return createTask({
        title: input.title,
        description: input.description,
        entityType: input.entityType,
        entityId: input.entityId,
        priority: input.priority ?? 'MEDIUM',
        dueDate: input.dueDate,
        assignedOfficerId: input.assignedOfficerId,
        assignedOfficerName: input.assignedOfficerName,
        createdBy: input.actorRole && input.actorRole !== 'SYSTEM' ? input.actorRole : 'SYSTEM',
        createdByName: input.actorName ?? 'Workflow Engine',
        note: input.note,
      });
    },
    [tasks, createTask],
  );

  // ── Complete all open tasks tied to an entity (Part B integration) ──
  const completeTaskForEntity = useCallback(
    (entityType: TaskEntityType, entityId: string, actorName: string, actorRole: ActorKind, note?: string) => {
      const targets = tasks.filter((t) => t.entityType === entityType && t.entityId === entityId && isTaskOpen(t));
      if (targets.length === 0) return;
      setTasks((prev) =>
        prev.map((t) =>
          targets.some((target) => target.id === t.id)
            ? {
                ...t,
                status: 'COMPLETED' as TaskStatus,
                completedAt: nowIso(),
                history: [...t.history, appendHistory(t, { actor: actorName, actorRole, action: 'Status → COMPLETED', ...(note ? { note } : {}) })],
              }
            : t,
        ),
      );
      targets.forEach((t) => {
        emitAudit(t, 'Task completed', actorName, actorRole, `${t.id} "${t.title}" completed by ${actorName}${note ? ` — ${note}` : ''}.`, 'COMPLETED');
        emitNotification({
          recipientRole: t.assignedOfficerName ? 'OFFICER' : 'ALL',
          ...(t.assignedOfficerId ? { recipientUserId: t.assignedOfficerId } : {}),
          title: 'Task completed',
          message: `${t.id} — ${t.title} was completed by ${actorName}.`,
          type: 'TASK',
          priority: 'MEDIUM',
          linkUrl: `/workflow?task=${t.id}`,
        });
      });
    },
    [tasks, emitAudit, emitNotification],
  );

  // ── Assign / reassign ──
  const assignTask = useCallback(
    (taskId: string, officerId: string, officerName: string, actorName: string, actorRole: ActorKind, note?: string): boolean => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return false;
      const isReassign = Boolean(task.assignedOfficerId);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                assignedOfficerId: officerId,
                assignedOfficerName: officerName,
                status: t.status === 'PENDING' ? ('ASSIGNED' as TaskStatus) : t.status,
                history: [...t.history, appendHistory(t, { actor: actorName, actorRole, action: isReassign ? 'Task reassigned' : 'Task assigned', ...(note ? { note } : {}) })],
              }
            : t,
        ),
      );
      emitAudit(task, isReassign ? 'Task reassigned' : 'Task assigned', actorName, actorRole, `${task.id} "${task.title}" ${isReassign ? 're' : ''}assigned to ${officerName} by ${actorName}.`);
      emitNotification({
        recipientRole: 'OFFICER',
        recipientUserId: officerId,
        title: isReassign ? 'Task reassigned to you' : 'Task assigned to you',
        message: `${task.id} — ${task.title} is now assigned to ${officerName}.`,
        type: 'TASK',
        priority: task.priority === 'CRITICAL' || task.priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
        linkUrl: `/workflow?task=${task.id}`,
      });
      return true;
    },
    [tasks, emitAudit, emitNotification],
  );

  // ── Status transitions ──
  const updateTaskStatus = useCallback(
    (taskId: string, nextStatus: TaskStatus, actorName: string, actorRole: ActorKind, note?: string): boolean => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return false;
      if (task.status === nextStatus) return false;
      if (!canTransitionTo(task, nextStatus)) return false;
      const terminal = nextStatus === 'COMPLETED' || nextStatus === 'CANCELLED';
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          const history = [...t.history, appendHistory(t, { actor: actorName, actorRole, action: `Status → ${nextStatus}`, ...(note ? { note } : {}) })];
          return {
            ...t,
            status: nextStatus,
            ...(terminal ? { completedAt: nowIso() } : {}),
            history,
          };
        }),
      );
      emitAudit(task, 'Task status updated', actorName, actorRole, `${task.id} "${task.title}" moved ${task.status} → ${nextStatus} by ${actorName}${note ? ` — ${note}` : ''}.`, terminal ? 'COMPLETED' : 'IN_PROGRESS');
      emitNotification({
        recipientRole: task.assignedOfficerName ? 'OFFICER' : 'ALL',
        ...(task.assignedOfficerId ? { recipientUserId: task.assignedOfficerId } : {}),
        title: 'Task status changed',
        message: `${task.id} — ${task.title} is now ${nextStatus.replace(/_/g, ' ')}.`,
        type: 'TASK',
        priority: nextStatus === 'COMPLETED' || nextStatus === 'CANCELLED' ? 'MEDIUM' : task.priority === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
        linkUrl: `/workflow?task=${task.id}`,
      });
      return true;
    },
    [tasks, emitAudit, emitNotification],
  );

  // ── Notes ──
  const addTaskNote = useCallback(
    (taskId: string, note: string, actorName: string, actorRole: ActorKind): boolean => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task || !note.trim()) return false;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, history: [...t.history, appendHistory(t, { actor: actorName, actorRole, action: 'Note added', note: note.trim() })] }
            : t,
        ),
      );
      return true;
    },
    [tasks],
  );

  const getTask = useCallback((id: string) => tasks.find((t) => t.id === id), [tasks]);
  const taskForEntity = useCallback(
    (entityType: TaskEntityType, entityId: string) => tasks.find((t) => t.entityType === entityType && t.entityId === entityId),
    [tasks],
  );

  return (
    <WorkflowContext.Provider
      value={{
        tasks,
        collaborators,
        getTask,
        taskForEntity,
        openTasks,
        openCount,
        pendingCount,
        assignedCount,
        inProgressCount,
        underReviewCount,
        overdueCount,
        criticalOpenCount,
        completedCount,
        createTask,
        ensureTaskForEntity,
        completeTaskForEntity,
        assignTask,
        updateTaskStatus,
        addTaskNote,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflow = (): WorkflowContextType => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
};