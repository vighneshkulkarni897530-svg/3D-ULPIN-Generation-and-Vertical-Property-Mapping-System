"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { TaskPriority, TaskStatus } from "@/types/workflow";

const statusStyles: Record<TaskStatus, string> = {
  PENDING: "bg-amber-50 border-amber-200 text-amber-700",
  ASSIGNED: "bg-blue-50 border-blue-200 text-blue-700",
  IN_PROGRESS: "bg-cyan-50 border-cyan-200 text-cyan-700",
  UNDER_REVIEW: "bg-violet-50 border-violet-200 text-violet-700",
  COMPLETED: "bg-emerald-50 border-emerald-200 text-emerald-700",
  CANCELLED: "bg-slate-100 border-slate-200 text-slate-500",
};

const priorityStyles: Record<TaskPriority, string> = {
  LOW: "bg-slate-100 border-slate-200 text-slate-600",
  MEDIUM: "bg-blue-50 border-blue-200 text-blue-700",
  HIGH: "bg-amber-50 border-amber-200 text-amber-700",
  CRITICAL: "bg-red-50 border-red-200 text-red-600",
};

export function TaskStatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest", statusStyles[status], className)}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function TaskPriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest", priorityStyles[priority], className)}>
      {priority === "CRITICAL" && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {priority}
    </span>
  );
}