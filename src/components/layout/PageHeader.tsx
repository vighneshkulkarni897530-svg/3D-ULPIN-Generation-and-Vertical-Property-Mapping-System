import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

/** Consistent page headline block used across all dashboards & tool pages. */
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4", className)}>
      <div className="space-y-1.5">
        {eyebrow && (
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-600">{eyebrow}</span>
        )}
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">{title}</h1>
        {description && <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionHeader({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-sm font-extrabold tracking-tight text-slate-900">
          {icon && <span className="text-cyan-600">{icon}</span>}
          {title}
        </h3>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function SectionTitle({
  children,
  icon,
  className,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn("flex items-center gap-2 text-sm font-extrabold tracking-tight text-slate-900", className)}>
      {icon && <span className="text-cyan-600">{icon}</span>}
      {children}
    </h3>
  );
}