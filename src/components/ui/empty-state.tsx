import * as React from "react";
import { SearchX, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center", className)}>
      <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 mb-4">
        {icon ?? <SearchX className="h-7 w-7" />}
      </div>
      <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this section. The cadastral service returned an unexpected response.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/50 p-10 text-center", className)}>
      <div className="p-3.5 rounded-2xl bg-red-100 border border-red-200 text-red-500 mb-4">
        <RotateCcw className="h-7 w-7" />
      </div>
      <h3 className="text-sm font-extrabold text-red-900 tracking-tight">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-red-600/90 leading-relaxed">{description}</p>
      {onRetry && (
        <Button variant="destructive" size="sm" className="mt-5" onClick={onRetry}>
          Retry Request
        </Button>
      )}
    </div>
  );
}
