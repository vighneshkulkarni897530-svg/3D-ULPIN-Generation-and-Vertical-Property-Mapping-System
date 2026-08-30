"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, Search, AlertCircle, FileCheck2, Home, Users, BarChart3, Map } from "lucide-react";
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
          { label: "Disputes", href: "/disputes", icon: AlertCircle },
          { label: "Field", href: "/field-verification/request", icon: FileCheck2 },
        ]
      : role === "ADMIN"
      ? [
          { label: "Admin", href: "/dashboard/admin", icon: BarChart3 },
          { label: "Registry", href: "/properties", icon: Search },
          { label: "Officers", href: "/dashboard/admin?tab=officers", icon: Users },
          { label: "Audit", href: "/dashboard/admin?tab=audit", icon: FileCheck2 },
        ]
      : [
          { label: "Home", href: "/", icon: Home },
          { label: "Search", href: "/properties", icon: Search },
          { label: "My Hub", href: "/dashboard/citizen", icon: LayoutDashboard },
          { label: "Dispute", href: "/disputes/new", icon: AlertCircle },
        ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-800 bg-slate-950/95 backdrop-blur-md py-2 px-2 md:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || (item.href.includes("?") && pathname === item.href.split("?")[0]);
        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-bold tracking-tight transition-colors",
              active ? "text-cyan-300 bg-cyan-500/10" : "text-slate-500 hover:text-slate-200"
            )}
          >
            <Icon className={cn("h-4.5 w-4.5", active && "text-cyan-400")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}