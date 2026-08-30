import * as React from "react";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Reusable loading primitives:
 *  - PageLoader   → centered spinner for full-page loads
 *  - SkeletonCard → single placeholder card
 *  - SkeletonCardGrid → grid of placeholders for list views
 *  - SkeletonTextLines → lines of placeholder text
 */

export function PageLoader({ label = "Loading cadastral data…", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex min-h-[40vh] flex-col items-center justify-center gap-4", className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-cyan-600 shadow-tech">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
      <p className="text-xs font-semibold tracking-tight text-slate-400">{label}</p>
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-5 shadow-tech", className)}>
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-3 w-24" />
      <Skeleton className="mt-2 h-6 w-2/3" />
      <Skeleton className="mt-3 h-3 w-full" />
      <Skeleton className="mt-1.5 h-3 w-4/5" />
    </div>
  );
}

export function SkeletonCardGrid({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonTextLines({ lines = 4, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}