"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, Search, AlertCircle, FileCheck2, Home, Users, BarChart3, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bottom tab navigation for mobile — role-aware shortcuts.
 * Visible only below the md breakpoint.
 */
export function MobileNavigation() {
  const pathname = usePathname();
  const { role } = useAuth();

  const items =
    role === "OFFICER"
      ? [
          { label: "Portal", href: "/dashboard/officer", icon: LayoutDashboard },
          { label: "Registry", href: "/properties", icon: Search },
          { label: "Verify", href: "/verification", icon: FileCheck2 },
          { label: "Tasks", href: "/workflow", icon: ClipboardList },
        ]
      : role === "ADMIN"
      ? [
          { label: "Admin", href: "/dashboard/admin", icon: BarChart3 },
          { label: "Registry", href: "/properties", icon: Search },
          { label: "Users", href: "/admin/users", icon: Users },
          { label: "Audit", href: "/admin/audit-log", icon: FileCheck2 },
        ]
      : [
          { label: "Home", href: "/", icon: Home },
          { label: "Search", href: "/properties", icon: Search },
          { label: "My Hub", href: "/dashboard/citizen", icon: LayoutDashboard },
          { label: "Dispute", href: "/disputes/new", icon: AlertCircle },
        ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-800 bg-slate-950/95 backdrop-blur-md py-2 px-2 md:hidden" aria-label="Primary mobile">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || (item.href.includes("?") && pathname === item.href.split("?")[0]);
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-bold tracking-tight transition-colors",
              active ? "text-cyan-300 bg-cyan-500/10" : "text-slate-500 hover:text-slate-200"
            )}
          >
            <Icon className={cn("h-5 w-5", active && "text-cyan-400")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}