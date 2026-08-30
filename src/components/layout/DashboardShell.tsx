"use client";

import * as React from "react";
import { Sidebar } from "@/components/common/Sidebar";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

/** Shared shell: sidebar on desktop, stacked content with bottom-nav offset on mobile. */
export function DashboardShell({ children, className, contentClassName }: DashboardShellProps) {
  return (
    <div className={cn("flex min-h-[calc(100vh-5rem)] bg-slate-50", className)}>
      <Sidebar />
      <main
        className={cn(
          "flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pb-10 lg:pt-8 md:pb-10",
          contentClassName
        )}
      >
        {children}
      </main>
    </div>
  );
}