import * as React from "react";
import { cn } from "@/lib/utils";

interface FilterFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function FilterField({ label, children, className }: FilterFieldProps) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      {children}
    </label>
  );
}

/** Wrapper used inside FilterPanel / DataTable filter sections. */
export function FilterPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>{children}</div>;
}