"use client";

import * as React from "react";
import { CheckCircle2, Footprints, FilePenLine, type LucideIcon } from "lucide-react";
import type { SpatialConflict } from "@/types/conflict";
import { cn } from "@/lib/utils";

export type ConflictAction = "resolve" | "field" | "correction";

export const CONFLICT_ACTION_META: Record<
  ConflictAction,
  { title: string; verb: string; icon: LucideIcon; accent: string; buttonClass: string; confirmLabel: string }
> = {
  resolve: {
    title: "Mark Conflict as Resolved",
    verb: "resolve",
    icon: CheckCircle2,
    accent: "text-emerald-600",
    buttonClass: "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500",
    confirmLabel: "Confirm Resolution",
  },
  field: {
    title: "Send for Field Review",
    verb: "send for field review",
    icon: Footprints,
    accent: "text-cyan-600",
    buttonClass: "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500",
    confirmLabel: "Confirm Field Review Request",
  },
  correction: {
    title: "Request Data Correction",
    verb: "request a data correction for",
    icon: FilePenLine,
    accent: "text-amber-600",
    buttonClass: "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500",
    confirmLabel: "Submit Correction Request",
  },
};

export const CORRECTION_CATEGORIES = [
  "Geometry Correction",
  "Spatial Identifier Correction",
  "Parcel Boundary Review",
  "Property Relationship Review",
] as const;

interface ConflictActionDialogProps {
  open: boolean;
  action: ConflictAction | null;
  conflict: SpatialConflict | null;
  onClose: () => void;
  /** Called with required notes (and category for corrections) on confirm. */
  onConfirm: (notes: string, category?: string) => void;
}

/**
 * Keyboard-accessible officer action confirmation for conflicts. Notes are
 * mandatory; correction actions additionally require a category. Data
 * mutation happens exclusively through the GISContext actions invoked by the
 * onConfirm handler — this component holds no workflow state of its own.
 */
export function ConflictActionDialog({ open, action, conflict, onClose, onConfirm }: ConflictActionDialogProps) {
  const [notes, setNotes] = React.useState("");
  const [category, setCategory] = React.useState<string>(CORRECTION_CATEGORIES[0]);
  const [touched, setTouched] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (open) {
      setNotes("");
      setCategory(CORRECTION_CATEGORIES[0]);
      setTouched(false);
      const t = window.setTimeout(() => textareaRef.current?.focus(), 30);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !action || !conflict) return null;
  const meta = CONFLICT_ACTION_META[action];
  const Icon = meta.icon;
  const invalid = touched && notes.trim().length === 0;
  const canConfirm = notes.trim().length > 0;

  return (
    <DialogShell
      meta={meta}
      conflict={conflict}
      action={action}
      notes={notes}
      setNotes={setNotes}
      category={category}
      setCategory={setCategory}
      touched={touched}
      setTouched={setTouched}
      invalid={invalid}
      canConfirm={canConfirm}
      textareaRef={textareaRef}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

// ── Dialog shell ────────────────────────────────────────────────────────────

function DialogShell({
  meta,
  conflict,
  action,
  notes,
  setNotes,
  category,
  setCategory,
  touched,
  setTouched,
  invalid,
  canConfirm,
  textareaRef,
  onClose,
  onConfirm,
}: {
  meta: (typeof CONFLICT_ACTION_META)[ConflictAction];
  conflict: SpatialConflict;
  action: ConflictAction;
  notes: string;
  setNotes: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  touched: boolean;
  setTouched: (v: boolean) => void;
  invalid: boolean;
  canConfirm: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onClose: () => void;
  onConfirm: (notes: string, category?: string) => void;
}) {
  const Icon = meta.icon;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={meta.title}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-2xl">
        <div className="flex items-start gap-3">
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50", meta.accent)}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-slate-900">{meta.title}</h3>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
              You are about to {meta.verb} <span className="font-mono font-bold text-slate-700">{conflict.conflictNumber}</span>.
            </p>
          </div>
        </div>

        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] font-semibold leading-relaxed text-amber-800">
          Demo Spatial Conflict — this action updates the centralized demo registry only and does not modify any
          government cadastral record.
        </p>

        {action === "correction" && (
          <div className="mt-3">
            <label htmlFor="correction-category" className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Correction Category <span className="text-red-500">*</span>
            </label>
            <select
              id="correction-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            >
              {CORRECTION_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[9.5px] text-slate-400">Demo Data Correction Request — routed to the registry maintainers.</p>
          </div>
        )}

        <div className="mt-3">
          <label htmlFor="conflict-action-notes" className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            {action === "resolve" ? "Resolution Notes" : "Notes"} <span className="text-red-500">*</span>
          </label>
          <textarea
            id="conflict-action-notes"
            ref={textareaRef}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={invalid}
            placeholder={
              action === "resolve"
                ? "Describe how this spatial conflict was resolved…"
                : action === "field"
                  ? "Instructions for the field officer…"
                  : "Describe the correction required…"
            }
            className={cn(
              "w-full resize-none rounded-lg border bg-white px-3 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20",
              invalid ? "border-red-400" : "border-slate-300 focus:border-cyan-500",
            )}
          />
          {invalid && (
            <p role="alert" className="mt-1 text-[10px] font-bold text-red-600">
              Notes are required before this action can be confirmed.
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:border-slate-400"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => {
              setTouched(true);
              if (!canConfirm) return;
              onConfirm(notes.trim(), action === "correction" ? category : undefined);
            }}
            className={cn(
              "rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-40",
              meta.buttonClass,
            )}
          >
            {meta.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
