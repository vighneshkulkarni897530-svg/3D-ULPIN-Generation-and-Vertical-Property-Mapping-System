"use client";

import * as React from "react";
import { ShieldCheck, OctagonAlert, RefreshCcw, Footprints, type LucideIcon } from "lucide-react";
import type { PropertyUnit } from "@/types/gis";
import { cn } from "@/lib/utils";

export type VerificationAction = "verify" | "reject" | "reinspection" | "field";

export const ACTION_META: Record<
  VerificationAction,
  { title: string; verb: string; icon: LucideIcon; accent: string; buttonClass: string; confirmLabel: string }
> = {
  verify: {
    title: "Verify Property",
    verb: "verify",
    icon: ShieldCheck,
    accent: "text-emerald-600",
    buttonClass: "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500",
    confirmLabel: "Confirm Verification",
  },
  reject: {
    title: "Reject Property",
    verb: "reject",
    icon: OctagonAlert,
    accent: "text-red-600",
    buttonClass: "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500",
    confirmLabel: "Confirm Rejection",
  },
  reinspection: {
    title: "Request Re-inspection",
    verb: "request reinspection for",
    icon: RefreshCcw,
    accent: "text-amber-600",
    buttonClass: "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500",
    confirmLabel: "Confirm Re-inspection Request",
  },
  field: {
    title: "Send to Field Verification",
    verb: "send to field verification",
    icon: Footprints,
    accent: "text-cyan-600",
    buttonClass: "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500",
    confirmLabel: "Confirm Field Assignment",
  },
};

interface DecisionDialogProps {
  open: boolean;
  action: VerificationAction | null;
  property: PropertyUnit | null;
  onClose: () => void;
  /** Called with the required officer notes when the officer confirms. */
  onConfirm: (notes: string) => void;
}

/**
 * Keyboard-accessible officer decision confirmation. Notes are mandatory —
 * the confirm button stays disabled until a non-empty note is entered.
 */
export function DecisionDialog({ open, action, property, onClose, onConfirm }: DecisionDialogProps) {
  const [notes, setNotes] = React.useState("");
  const [touched, setTouched] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Reset + focus the notes field whenever the dialog opens.
  React.useEffect(() => {
    if (open) {
      setNotes("");
      setTouched(false);
      const t = window.setTimeout(() => textareaRef.current?.focus(), 30);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  // Escape closes the dialog.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !action || !property) return null;
  const meta = ACTION_META[action];
  const Icon = meta.icon;
  const invalid = touched && notes.trim().length === 0;
  const canConfirm = notes.trim().length > 0;

  return <DialogShell meta={meta} property={property} notes={notes} setNotes={setNotes} touched={touched} setTouched={setTouched} invalid={invalid} canConfirm={canConfirm} textareaRef={textareaRef} onClose={onClose} onConfirm={onConfirm} />;
}

// ── Dialog shell ────────────────────────────────────────────────────────────

interface DialogShellProps {
  meta: (typeof ACTION_META)[VerificationAction];
  property: PropertyUnit;
  notes: string;
  setNotes: (value: string) => void;
  touched: boolean;
  setTouched: (value: boolean) => void;
  invalid: boolean;
  canConfirm: boolean;
  textareaRef: { current: HTMLTextAreaElement | null };
  onClose: () => void;
  onConfirm: (notes: string) => void;
}

function DialogShell({
  meta,
  property,
  notes,
  setNotes,
  touched,
  setTouched,
  invalid,
  canConfirm,
  textareaRef,
  onClose,
  onConfirm,
}: DialogShellProps) {
  const Icon = meta.icon;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="decision-dialog-title"
        className="w-full max-w-md rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start gap-3">
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50", meta.accent)}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 id="decision-dialog-title" className="text-sm font-extrabold tracking-tight text-slate-900">
              {meta.title}
            </h2>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
              You are about to <strong className="text-slate-700">{meta.verb}</strong>{" "}
              <span className="font-mono font-bold text-slate-800">{property.id}</span> (demo spatial ID{" "}
              <span className="font-mono">{property.demoSpatialId}</span>).
            </p>
          </div>
        </div>

        <label htmlFor="decision-notes" className="mt-4 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
          Verification notes <span className="text-red-500">*</span>
        </label>
        <textarea
          id="decision-notes"
          ref={textareaRef}
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => setTouched(true)}
          aria-required="true"
          aria-invalid={invalid}
          placeholder="Record the officer's reasoning, field observations and any evidence references…"
          className={cn(
            "mt-1.5 w-full resize-y rounded-xl border bg-white px-3 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2",
            invalid ? "border-red-300 focus:border-red-400 focus:ring-red-200" : "border-slate-300 focus:border-cyan-400 focus:ring-cyan-200",
          )}
        />
        {invalid && (
          <p role="alert" className="mt-1.5 text-[10px] font-bold text-red-600">
            Verification notes are required before this decision can be recorded.
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 sm:py-2"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => {
              if (!canConfirm) {
                setTouched(true);
                return;
              }
              onConfirm(notes.trim());
            }}
            className={cn(
              "rounded-xl px-4 py-2.5 text-xs font-black text-white shadow-lg transition-all sm:py-2",
              meta.buttonClass,
              !canConfirm && "cursor-not-allowed opacity-40 shadow-none",
            )}
          >
            {meta.confirmLabel}
          </button>
        </div>

        <p className="mt-3 border-t border-slate-100 pt-2.5 text-[9px] leading-relaxed text-slate-400">
          The decision, notes and evidence flags are recorded centrally and immediately reflected in the queue,
          dashboards, activity feed and GIS map.
        </p>
      </div>
    </div>
  );
}

