"use client";

import * as React from "react";
import { ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskPriorityBadge, TaskStatusBadge } from "@/components/workflow/badges";
import { entityLabel, formatDueStatus, isTaskOverdue } from "@/lib/workflow";
import { formatRelativeTime } from "@/lib/gisUtils";
import type { WorkflowTask } from "@/types/workflow";

const TASK_COLORS: Record<WorkflowTask["entityType"], string> = {
  PROPERTY: "bg-blue-50 border-blue-200 text-blue-600",
  CONFLICT: "bg-red-50 border-red-200 text-red-600",
  FIELD_VERIFICATION: "bg-cyan-50 border-cyan-200 text-cyan-600",
  REINSPECTION: "bg-amber-50 border-amber-200 text-amber-600",
  DATA_REVIEW: "bg-violet-50 border-violet-200 text-violet-600",
  BUILDING: "bg-slate-100 border-slate-200 text-slate-600",
  PARCEL: "bg-emerald-50 border-emerald-200 text-emerald-600",
  FLOOR: "bg-indigo-50 border-indigo-200 text-indigo-600",
};

interface TaskListProps {
  tasks: WorkflowTask[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

/** Scrollable task registry — each card is clickable and shows entity, priority, status, assignee and due state. */
export function TaskList({ tasks, selectedId, onSelect, emptyTitle = "No tasks match", emptyDescription = "Try clearing the filters or create a new task.", className }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className={cn("rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center", className)}>
        <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-2 text-xs font-extrabold text-slate-700">{emptyTitle}</p>
        <p className="mt-1 text-[11px] text-slate-500">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2.5", className)}>
      {tasks.map((task) => {
        const overdue = isTaskOverdue(task);
        const dueStatus = formatDueStatus(task);
        return (
          <button
            key={task.id}
            type="button"
            onClick={() => onSelect(task.id)}
            className={cn(
              "w-full rounded-2xl border bg-white p-3.5 text-left shadow-tech transition-all hover:-translate-y-0.5 hover:shadow-tech-lg",
              selectedId === task.id ? "border-cyan-400 ring-2 ring-cyan-500/20" : "border-slate-200",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-mono text-[10px] font-extrabold text-slate-400">{task.id}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                <TaskPriorityBadge priority={task.priority} />
                <TaskStatusBadge status={task.status} />
              </span>
            </div>
            <p className="mt-1 line-clamp-1 text-xs font-extrabold tracking-tight text-slate-900">{task.title}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className={cn("rounded-md border px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider", TASK_COLORS[task.entityType])}>
                {task.entityType.replace(/_/g, " ")}
              </span>
              <span className="font-mono text-[9px] text-slate-500">{task.entityId}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[9.5px] text-slate-500">
              <span className="flex min-w-0 items-center gap-1 truncate">
                <span className="truncate">{task.assignedOfficerName ?? "Unassigned"}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {dueStatus && (
                  <span className={cn("rounded-full px-1.5 py-0.5 font-extrabold uppercase tracking-widest", overdue ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500")}>
                    {dueStatus}
                  </span>
                )}
                <span className="font-mono text-slate-400">{formatRelativeTime(task.createdAt)}</span>
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}