"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGIS } from "@/context/GISContext";
import { TASK_ENTITY_LABELS } from "@/types/workflow";
import type { UserRole } from "@/types";
import type {
  Collaborator,
  CreateTaskInput,
  TaskEntityType,
  TaskPriority,
} from "@/types/workflow";

const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const ENTITY_TYPES: TaskEntityType[] = [
  "PROPERTY",
  "CONFLICT",
  "FIELD_VERIFICATION",
  "REINSPECTION",
  "DATA_REVIEW",
  "BUILDING",
  "PARCEL",
  "FLOOR",
];

interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
  currentUserName: string;
  role: UserRole;
  collaborators: Collaborator[];
  onCreate: (input: CreateTaskInput) => void;
}

export function CreateTaskDialog({
  open,
  onClose,
  currentUserName,
  role,
  collaborators,
  onCreate,
}: CreateTaskDialogProps) {
  const { properties, conflicts } = useGIS();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [entityType, setEntityType] = React.useState<TaskEntityType>("PROPERTY");
  const [entityId, setEntityId] = React.useState("");
  const [priority, setPriority] = React.useState<TaskPriority>("MEDIUM");
  const [dueDate, setDueDate] = React.useState("");
  const [assigneeId, setAssigneeId] = React.useState("");
  const [touched, setTouched] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setEntityType("PROPERTY");
      setEntityId("");
      setPriority("MEDIUM");
      setDueDate("");
      setAssigneeId("");
      setTouched(false);
    }
  }, [open]);

  const entityOptions =
    entityType === "PROPERTY"
      ? properties.map((p) => ({ id: p.id, label: `${p.id} · ${p.buildingId}` }))
      : entityType === "CONFLICT"
        ? conflicts.map((c) => ({ id: c.id, label: `${c.id} · ${c.type} (${c.severity})` }))
        : [];

  const invalid = touched && title.trim().length === 0;
  const canCreate = title.trim().length > 0 && entityId.trim().length > 0;

  const submit = () => {
    if (!canCreate) {
      setTouched(true);
      return;
    }
    const assignee = collaborators.find((c) => c.id === assigneeId);
    onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      entityType,
      entityId: entityId.trim(),
      priority,
      dueDate: dueDate || undefined,
      assignedOfficerId: assignee?.id,
      assignedOfficerName: assignee?.name,
      createdBy: role === "ADMIN" ? "ADMIN" : "OFFICER",
      createdByName: currentUserName,
    });
    onClose();
  };

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500/20";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-cyan-600" /> Create Workflow Task
          </DialogTitle>
          <DialogDescription>
            Create a task linked to a registry entity. Tasks reference centralized GIS data — no duplicate records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="e.g. Field verification — PROP-102-G02"
              className={inputCls}
              aria-invalid={invalid}
            />
            {invalid && <p role="alert" className="mt-1 text-[10px] font-bold text-red-600">Title is required.</p>}
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Task scope, context, expected outcome…" className={inputCls} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Entity type</label>
              <select value={entityType} onChange={(e) => { setEntityType(e.target.value as TaskEntityType); setEntityId(""); }} className={inputCls}>
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>{TASK_ENTITY_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Entity ID <span className="text-red-500">*</span>
              </label>
              {entityOptions.length > 0 ? (
                <select value={entityId} onChange={(e) => setEntityId(e.target.value)} className={inputCls}>
                  <option value="">Select…</option>
                  {entityOptions.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  placeholder={entityType === "FLOOR" ? "e.g. FLOOR-102-2" : entityType === "BUILDING" ? "e.g. B-102" : entityType === "PARCEL" ? "e.g. PARCEL-MH-PUN-001" : "Reference ID"}
                  className={inputCls}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={inputCls}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Assign to</label>
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={inputCls}>
                <option value="">Unassigned</option>
                {collaborators.filter((c) => c.role === "OFFICER" || c.role === "ADMIN").map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canCreate}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-extrabold text-slate-950 transition-all hover:from-cyan-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Create Task
          </button>
                      </DialogFooter>
    </DialogContent>
  </Dialog>
);
}