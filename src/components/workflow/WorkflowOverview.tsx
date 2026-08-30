"use client";

import * as React from "react";
import {
  ClipboardList,
  Clock,
  ListChecks,
  ShieldAlert,
  UserCheck,
  PlayCircle,
  Eye,
  History,
} from "lucide-react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { SectionHeader } from "@/components/layout/PageHeader";
import type { WorkflowContextType } from "@/context/WorkflowContext";

interface WorkflowOverviewProps {
  workflow: WorkflowContextType;
  role: string;
  currentUserName: string;
  className?: string;
}

/**
 * Section A — Workflow overview. Every KPI is computed live from the
 * centralized WorkflowContext task state — nothing is hardcoded.
 */
export function WorkflowOverview({ workflow, role, currentUserName, className }: WorkflowOverviewProps) {
  const w = workflow;
  const myTasks = role === "OFFICER" || role === "ADMIN"
    ? w.openTasks.filter((t) => t.assignedOfficerName === currentUserName).length
    : 0;

  const cards = [
    { label: "Open Tasks", value: String(w.openCount), sub: `${w.completedCount} completed`, icon: <ClipboardList className="h-5 w-5" />, tone: "cyan" as const },
    { label: "Pending", value: String(w.pendingCount), sub: "Awaiting assignment", icon: <Clock className="h-5 w-5" />, tone: "amber" as const },
    { label: "Assigned", value: String(w.assignedCount), sub: "Allocated to officers", icon: <UserCheck className="h-5 w-5" />, tone: "blue" as const },
    { label: "In Progress", value: String(w.inProgressCount), sub: "Active field/work", icon: <PlayCircle className="h-5 w-5" />, tone: "cyan" as const },
    { label: "Awaiting Review", value: String(w.underReviewCount), sub: "Under officer review", icon: <Eye className="h-5 w-5" />, tone: "navy" as const },
    { label: "Overdue", value: String(w.overdueCount), sub: "Past due date", icon: <History className="h-5 w-5" />, tone: "red" as const },
    { label: "Critical", value: String(w.criticalOpenCount), sub: "Critical open tasks", icon: <ShieldAlert className="h-5 w-5" />, tone: "red" as const },
    ...(role === "OFFICER" || role === "ADMIN" ? [{ label: "Assigned to me", value: String(myTasks), sub: `As ${currentUserName}`, icon: <ListChecks className="h-5 w-5" />, tone: "green" as const }] : []),
  ];

  return (
    <section className={className} aria-label="Workflow overview">
      <div className="mb-4">
        <SectionHeader
          icon={<ClipboardList className="h-4 w-4" />}
          title="Workflow Overview"
          description="Live task statistics derived from the centralized workflow store."
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {cards.map((c) => (
          <DashboardCard key={c.label} label={c.label} value={c.value} sub={c.sub} icon={c.icon} tone={c.tone} />
        ))}
      </div>
    </section>
  );
}