"use client";

import * as React from "react";
import { Search, RotateCcw } from "lucide-react";
import { Select } from "@/components/ui/select";
import { FilterField, FilterPanel } from "@/components/dashboard/FilterPanel";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/types/workflow";

export interface TaskFilterState {
  query: string;
  status: TaskFilterStatus;
  priority: TaskFilterPriority;
  assignee: TaskFilterAssignee;
}

export type TaskFilterStatus = "ALL" | "OPEN" | (typeof TASK_STATUSES)[number];
export type TaskFilterPriority = "ALL" | (typeof TASK_PRIORITIES)[number];
export type TaskFilterAssignee = "ALL" | "UNASSIGNED" | "ME" | string;

interface TaskFiltersProps {
  filters: TaskFilterState;
  onChange: (patch: Partial<TaskFilterState>) => void;
  onClear: () => void;
  assigneeOptions: Array<{ id: string; name: string }>;
  active: boolean;
  className?: string;
}

const selectCls =
  "cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500/20";

/**
 * Interactive task filters — search by id/title/entity, status, priority and
 * assignee. Changes flow up to the page and filter the task list live.
 */
export function TaskFilters({ filters, onChange, onClear, assigneeOptions, active, className }: TaskFiltersProps) {
  return (
    <div className={className}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={filters.query}
          onChange={(e) => onChange({ query: e.target.value })}
          placeholder="Search task, entity ID, property…"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500/20"
          aria-label="Search tasks"
        />
      </div>

      <FilterPanel className="mt-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-3">
        <FilterField label="Status">
          <Select
            value={filters.status}
            onChange={(e) => onChange({ status: e.target.value as TaskFilterStatus })}
            aria-label="Filter by status"
          >
            <option value="ALL">All statuses</option>
            <option value="OPEN">Open (active)</option>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="Priority">
          <Select
            value={filters.priority}
            onChange={(e) => onChange({ priority: e.target.value as TaskFilterPriority })}
            aria-label="Filter by priority"
          >
            <option value="ALL">All priorities</option>
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="Assignee">
          <Select
            value={filters.assignee}
            onChange={(e) => onChange({ assignee: e.target.value as TaskFilterAssignee })}
            aria-label="Filter by assignee"
          >
            <option value="ALL">All assignees</option>
            <option value="UNASSIGNED">Unassigned</option>
            <option value="ME">Assigned to me</option>
            {assigneeOptions.map((o) => (
              <option key={o.id} value={o.name}>{o.name}</option>
            ))}
          </Select>
        </FilterField>
      </FilterPanel>

      {active && (
        <button
          type="button"
          onClick={onClear}
          className="mt-3 flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-500 transition-colors hover:border-red-300 hover:text-red-600"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Clear filters
        </button>
      )}
    </div>
  );
}