"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardList, Plus } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader, SectionHeader } from "@/components/layout/PageHeader";
import { WorkflowOverview } from "@/components/workflow/WorkflowOverview";
import { TaskFilters, type TaskFilterState } from "@/components/workflow/TaskFilters";
import { TaskList } from "@/components/workflow/TaskList";
import { TaskDetailPanel } from "@/components/workflow/TaskDetailPanel";
import { CreateTaskDialog } from "@/components/workflow/CreateTaskDialog";
import { CollaborationPanel } from "@/components/workflow/CollaborationPanel";
import { useWorkflow } from "@/context/WorkflowContext";
import { useAuth } from "@/context/AuthContext";
import { canCreateTask } from "@/lib/workflow";
import type { TaskStatus } from "@/types/workflow";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function WorkflowPage() {
  return (
    <ProtectedRoute>
      <WorkflowPageContent />
    </ProtectedRoute>
  );
}

function WorkflowPageContent() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-xs font-semibold text-slate-400">Loading workflow workspace…</p>
        </div>
      }
    >
      <WorkflowPageInner />
    </React.Suspense>
  );
}

function WorkflowPageInner() {
  const { role, currentUser } = useAuth();
  const workflow = useWorkflow();
  const searchParams = useSearchParams();

  const initialTaskId = searchParams.get("task");
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(initialTaskId);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [filters, setFilters] = React.useState<TaskFilterState>({
    query: "",
    status: "OPEN",
    priority: "ALL",
    assignee: "ALL",
  });

  // URL deep link / back-forward keeps ?task= authoritative.
  React.useEffect(() => {
    setSelectedTaskId(searchParams.get("task"));
  }, [searchParams]);

  // ── Derived task list (centralized state only, filters applied live) ──
  const filteredTasks = React.useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    const base = filters.status === "ALL"
      ? [...workflow.tasks]
      : filters.status === "OPEN"
        ? workflow.openTasks
        : workflow.tasks.filter((t) => t.status === filters.status);

    return base.filter((t) => {
      if (filters.priority !== "ALL" && t.priority !== filters.priority) return false;
      if (filters.assignee === "UNASSIGNED") {
        if (t.assignedOfficerName) return false;
      } else if (filters.assignee === "ME") {
        if (t.assignedOfficerName !== currentUser.name) return false;
      } else if (filters.assignee !== "ALL") {
        if (t.assignedOfficerName !== filters.assignee) return false;
      }
      if (q) {
        const hay = [t.id, t.title, t.entityType, t.entityId, t.assignedOfficerName ?? "", t.description ?? ""]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [workflow.tasks, workflow.openTasks, filters, currentUser.name]);

  const selectedTask = selectedTaskId ? (workflow.getTask(selectedTaskId) ?? null) : null;

  // Select the most recent task by default when none is deep-linked.
  React.useEffect(() => {
    if (!selectedTaskId && workflow.openTasks.length > 0) {
      setSelectedTaskId(workflow.openTasks[0].id);
    }
  }, [selectedTaskId, workflow.openTasks]);

  const assigneeOptions = Array.from(
    new Map(
      workflow.tasks
        .filter((t) => t.assignedOfficerName)
        .map((t) => [t.assignedOfficerName as string, { name: t.assignedOfficerName as string }]),
    ).values(),
  ).map((o) => ({ id: o.name, name: o.name }));

  const recentEvents = React.useMemo(() => {
    const events = workflow.tasks.flatMap((t) =>
      t.history.map((h) => ({ id: `${t.id}-${h.id}`, taskId: t.id, actor: h.actor, action: h.action, timestamp: h.timestamp })),
    );
    return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 6);
  }, [workflow.tasks]);

  // ── Handlers (all mutate centralized WorkflowContext) ──
  const handleStatusChange = (taskId: string, next: TaskStatus, note: string) => {
    workflow.updateTaskStatus(taskId, next, currentUser.name, role === "ADMIN" ? "ADMIN" : role === "OFFICER" ? "OFFICER" : "CITIZEN", note || undefined);
  };
  const handleAssign = (taskId: string, officerId: string, officerName: string) => {
    workflow.assignTask(taskId, officerId, officerName, currentUser.name, role === "ADMIN" ? "ADMIN" : "OFFICER");
  };
  const handleAddNote = (taskId: string, note: string) => {
    workflow.addTaskNote(taskId, note, currentUser.name, role === "ADMIN" ? "ADMIN" : role === "OFFICER" ? "OFFICER" : "CITIZEN");
  };
  const handleCreate = (input: Parameters<typeof workflow.createTask>[0]) => {
    const created = workflow.createTask(input);
    if (created) setSelectedTaskId(created.id);
  };

  const patchFilters = (patch: Partial<TaskFilterState>) => setFilters((prev) => ({ ...prev, ...patch }));
  const clearFilters = () => setFilters({ query: "", status: "OPEN", priority: "ALL", assignee: "ALL" });
  const filterActive = filters.query !== "" || filters.status !== "OPEN" || filters.priority !== "ALL" || filters.assignee !== "ALL";

  const canCreate = canCreateTask(role);

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          eyebrow="WORKFLOW MANAGEMENT"
          title="Workflow & Task Management"
          description="Operational task queue connecting verification, field work, conflict resolution and data review — with a centralized audit trail and demo collaboration presence."
          actions={
            canCreate ? (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-black text-slate-950 shadow-tech-cyan transition-all hover:from-cyan-400 hover:to-blue-500"
              >
                <Plus className="h-4 w-4" /> New Task
              </button>
            ) : (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Read-only role
              </span>
            )
          }
        />

        {/* Role + demo collaboration banner */}
        <p className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[11px] font-semibold text-slate-600">
          <ClipboardList className="h-3.5 w-3.5 text-cyan-600" />
          Viewing as <span className="font-black text-slate-900">{currentUser.name}</span> ({role}) —{" "}
          {canCreate
            ? "full workflow controls (create, assign, progress)."
            : "read-only workflow visibility. Officers and admins can manage task state."}
          <span className="ml-auto rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-[9px] font-bold text-amber-700">
            Demo Collaboration Presence
          </span>
        </p>

        <WorkflowOverview workflow={workflow} role={role} currentUserName={currentUser.name} />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_minmax(0,1fr)_320px]">
          {/* Left — queue + filters */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-tech" aria-label="Task queue">
            <div className="mb-3">
              <SectionHeader
                icon={<ClipboardList className="h-4 w-4" />}
                title="Task Queue"
                description={`${filteredTasks.length} shown · ${workflow.openCount} open`}
              />
            </div>
            <TaskFilters
              filters={filters}
              onChange={patchFilters}
              onClear={clearFilters}
              assigneeOptions={assigneeOptions}
              active={filterActive}
            />
            <TaskList
              tasks={filteredTasks}
              selectedId={selectedTaskId}
              onSelect={setSelectedTaskId}
              className="mt-4"
            />
          </section>

          {/* Center — detail */}
          <TaskDetailPanel
            task={selectedTask}
            role={role}
            currentUserName={currentUser.name}
            collaborators={workflow.collaborators}
            onAssign={handleAssign}
            onStatusChange={handleStatusChange}
            onAddNote={handleAddNote}
          />

          {/* Right — demo collaboration */}
          <CollaborationPanel
            collaborators={workflow.collaborators}
            recentEvents={recentEvents}
          />
        </div>

        <CreateTaskDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          currentUserName={currentUser.name}
          role={role}
          collaborators={workflow.collaborators}
          onCreate={handleCreate}
        />
      </div>
    </PageContainer>
  );
}