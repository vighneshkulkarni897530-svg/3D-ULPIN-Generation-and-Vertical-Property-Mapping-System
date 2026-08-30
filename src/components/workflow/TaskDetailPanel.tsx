"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Flag,
  History,
  Lock,
  MessageSquarePlus,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { useGIS } from "@/context/GISContext";
import { TaskPriorityBadge, TaskStatusBadge } from "@/components/workflow/badges";
import {
  TASK_TRANSITIONS,
  canAssignTask,
  canOperateTask,
  canReassignTask,
  canTransitionTo,
  entityLabel,
  isTaskOverdue,
  formatDueStatus,
} from "@/lib/workflow";
import { formatRelativeTime } from "@/lib/gisUtils";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";
import type { Collaborator, TaskStatus, WorkflowTask } from "@/types/workflow";

interface TaskDetailPanelProps {
  task: WorkflowTask | null;
  role: UserRole;
  currentUserName: string;
  collaborators: Collaborator[];
  onAssign: (taskId: string, officerId: string, officerName: string) => void;
  onStatusChange: (taskId: string, next: TaskStatus, note: string) => void;
  onAddNote: (taskId: string, note: string) => void;
  className?: string;
}

function entityHref(task: WorkflowTask, buildingIdForFloor?: string): string | null {
  switch (task.entityType) {
    case "PROPERTY":
    case "FIELD_VERIFICATION":
    case "REINSPECTION":
      return `/verification?property=${task.entityId}`;
    case "CONFLICT":
      return `/conflicts?conflict=${task.entityId}`;
    case "BUILDING":
      return `/buildings/${task.entityId}`;
    case "PARCEL":
      return `/map?parcel=${task.entityId}`;
    case "FLOOR":
      return buildingIdForFloor ? `/buildings/${buildingIdForFloor}/floors` : `/map?floor=${task.entityId}`;
    case "DATA_REVIEW":
      return `/map?parcel=${task.entityId}`;
    default:
      return null;
  }
}

/**
 * Task detail workspace. Status transitions are role-aware and only offered
 * when allowed by the centralized transition map and the viewer's role.
 * Assignment is ADMIN (any officer) / OFFICER (self-claim only). Citizens see
 * a read-only view.
 */
export function TaskDetailPanel({ task, role, currentUserName, collaborators, onAssign, onStatusChange, onAddNote, className }: TaskDetailPanelProps) {
  const { floors } = useGIS();
  const [note, setNote] = React.useState("");
  const [assigneeId, setAssigneeId] = React.useState<string>("");
  const [statusNote, setStatusNote] = React.useState("");

  React.useEffect(() => {
    setNote("");
    setStatusNote("");
    setAssigneeId(task?.assignedOfficerId ?? "");
  }, [task?.id]);

  if (!task) {
    return (
      <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-10 text-center", className)}>
        <ClipboardList className="h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm font-black text-slate-800">Select a task</p>
        <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-slate-500">
          Choose a task from the registry to review its details, track status, view the audit history and manage assignment.
        </p>
      </div>
    );
  }

  const operate = canOperateTask(role);
  const assignable = canAssignTask(role);
  const canReassign = canReassignTask(role, task, currentUserName);
  const overdue = isTaskOverdue(task);
  const dueStatus = formatDueStatus(task);
  const floorBuilding = task.entityType === "FLOOR" ? floors.find((f) => f.id === task.entityId)?.buildingId : undefined;
  const href = entityHref(task, floorBuilding);

  const transitions = TASK_TRANSITIONS[task.status];
  const statusLocked = task.status === "COMPLETED" || task.status === "CANCELLED";
  const assigneeOptions = collaborators.filter((c) => c.role === "OFFICER" || c.role === "ADMIN");

  const handleAssign = () => {
    const target = assigneeOptions.find((o) => o.id === assigneeId);
    if (target) onAssign(task.id, target.id, target.name);
  };

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-5 shadow-tech", className)}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-black text-slate-400">{task.id}</span>
            <TaskPriorityBadge priority={task.priority} />
            <TaskStatusBadge status={task.status} />
          </div>
          <h2 className="mt-1.5 text-base font-black tracking-tight text-slate-900">{task.title}</h2>
          <p className="mt-0.5 font-mono text-[10px] text-slate-500">{entityLabel(task.entityType, task.entityId)}</p>
        </div>
        {href && (
          <Link
            href={href}
            className="flex shrink-0 items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-[10px] font-black text-cyan-300 transition-colors hover:bg-slate-800"
          >
            Open related <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Meta */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Assignee</p>
          <p className="mt-0.5 truncate text-[11px] font-extrabold text-slate-800">{task.assignedOfficerName ?? "Unassigned"}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Created</p>
          <p className="mt-0.5 truncate text-[11px] font-extrabold text-slate-800">{task.createdByName}</p>
          <p className="font-mono text-[9px] text-slate-400">{formatRelativeTime(task.createdAt)}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
          <p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
            <CalendarDays className="h-3 w-3" /> Due
          </p>
          {task.dueDate ? (
            <p className={cn("mt-0.5 text-[11px] font-extrabold", overdue ? "text-red-600" : "text-slate-800")}>
              {new Date(task.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              {dueStatus && <span className="ml-1 font-mono text-[9px]">· {dueStatus}</span>}
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] font-extrabold text-slate-400">No due date</p>
          )}
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Closed</p>
          <p className="mt-0.5 text-[11px] font-extrabold text-slate-800">
            {task.completedAt ? formatRelativeTime(task.completedAt) : "—"}
          </p>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <p className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-[12px] leading-relaxed text-slate-600">
          {task.description}
        </p>
      )}

      {/* Status progression */}
      <div className="mt-5">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <Flag className="h-3 w-3" /> Status progression
        </p>
        {statusLocked ? (
          <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-[11px] font-semibold text-slate-500">
            This task is <strong>{task.status.replace(/_/g, " ").toLowerCase()}</strong> and no further transitions are available.
          </p>
        ) : (
          <>
            {operate ? (
              <div className="flex flex-wrap items-center gap-2">
                {transitions.map((next) => {
                  const allowed =
                    canTransitionTo(task, next) && (role === "ADMIN" || !task.assignedOfficerName || task.assignedOfficerName === currentUserName);
                  const isComplete = next === "COMPLETED";
                  const isCancel = next === "CANCELLED";
                  return (
                    <button
                      key={next}
                      type="button"
                      disabled={!allowed}
                      title={allowed ? `Move to ${next.replace(/_/g, " ")}` : "Not permitted for your role/assignment"}
                      onClick={() => onStatusChange(task.id, next, statusNote.trim())}
                      className={cn(
                        "rounded-xl px-3 py-2 text-[10px] font-black transition-all",
                        !allowed && "cursor-not-allowed opacity-35",
                        isComplete && allowed
                          ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-400 hover:to-green-500"
                          : isCancel && allowed
                            ? "border border-slate-300 bg-white text-slate-500 hover:border-red-300 hover:text-red-500"
                            : allowed
                              ? "bg-slate-900 text-cyan-300 hover:bg-slate-800"
                              : "border border-slate-200 bg-white text-slate-400",
                      )}
                    >
                      {next.replace(/_/g, " ")}
                    </button>
                  );
                })}
                {transitions.length > 0 && (
                  <input
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Note for this transition (optional)"
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500/20"
                  />
                )}
              </div>
            ) : (
              <p className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] font-semibold text-slate-500">
                <Lock className="h-3.5 w-3.5 text-slate-400" /> Read-only — officers and admins can progress task status.
              </p>
            )}
            {operate && !canReassign && task.assignedOfficerName && task.assignedOfficerName !== currentUserName && (
              <p className="mt-2 text-[10px] font-semibold text-amber-600">
                This task is assigned to {task.assignedOfficerName} — status updates require assignment to your name or an admin.
              </p>
            )}
          </>
        )}
      </div>

      {/* Assignment */}
      <div className="mt-5">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <UserCheck className="h-3 w-3" /> Assignment
        </p>
        {role === "ADMIN" ? (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500/20"
              aria-label="Assign task to officer"
            >
              <option value="">Unassigned…</option>
              {assigneeOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.name} ({o.role})</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAssign}
              disabled={!assigneeId}
              className="flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2.5 text-[10px] font-black text-cyan-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <UserPlus className="h-3.5 w-3.5" /> {task.assignedOfficerId ? "Reassign" : "Assign"}
            </button>
          </div>
        ) : role === "OFFICER" ? (
          task.assignedOfficerName === currentUserName ? (
            <p className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-[11px] font-bold text-cyan-800">
              Assigned to you ✓
            </p>
          ) : (
            <button
              type="button"
              onClick={() => onAssign(task.id, currentUserName, currentUserName)}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-2 text-[10px] font-black text-cyan-700 transition-colors hover:bg-cyan-100"
            >
              <UserPlus className="h-3.5 w-3.5" /> Assign this task to me
            </button>
          )
        ) : (
          <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
            {task.assignedOfficerName ? `Currently assigned to ${task.assignedOfficerName}.` : "Unassigned."}
          </p>
        )}
      </div>

      {/* Notes */}
      {operate && (
        <div className="mt-5">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <MessageSquarePlus className="h-3 w-3" /> Add note
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Record an update, finding or instruction…"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
            <button
              type="button"
              disabled={!note.trim()}
              onClick={() => {
                onAddNote(task.id, note.trim());
                setNote("");
              }}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-[10px] font-black text-cyan-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-35"
            >
              Add note
            </button>
          </div>
        </div>
      )}

      {/* History / audit */}
      <div className="mt-5">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <History className="h-3 w-3" /> Task history & audit
        </p>
        <ol className="relative space-y-2.5 pl-4 before:absolute before:left-[5px] before:top-1 before:bottom-1 before:w-px before:bg-slate-200">
          {[...task.history].reverse().map((h) => (
            <li key={h.id} className="relative">
              <span className="absolute -left-4 top-1 h-2 w-2 rounded-full border border-slate-300 bg-white" />
              <div className="flex flex-wrap items-center justify-between gap-1">
                <p className="text-[11px] font-bold text-slate-800">{h.action}</p>
                <span className="font-mono text-[9px] text-slate-400">{formatRelativeTime(h.timestamp)}</span>
              </div>
              <p className="text-[10px] text-slate-500">
                {h.actor} · <span className="uppercase">{h.actorRole}</span>
                {h.note && <span className="text-slate-500"> — {h.note}</span>}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}