"use client";

import { SafeImage } from '@/components/ui/SafeImage';
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building, ChevronsLeft, ChevronsRight, X, ShieldCheck } from "lucide-react";
import { NAV_SECTIONS, isNavItemActive } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useGIS } from "@/context/GISContext";
import { RoleSwitcher } from "@/components/common/RoleSwitcher";

const PENDING_PROPERTY_STATUSES = [
  "Pending",
  "Under Review",
  "Field Verification",
  "Reinspection Required",
];

interface AppSidebarProps {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  drawer?: boolean;
  onClose?: () => void;
}

/**
 * Global application sidebar.
 *  - Desktop (lg+): sticky column, collapsible between full (w-64) and
 *    rail (w-[76px]) widths.
 *  - Mobile/tablet: rendered inside the AppShell drawer overlay.
 * Active states resolve through `isNavItemActive`, so nested routes
 * (`/properties/:id`, `/buildings/:id/floors`, …) keep their section lit.
 */
export function AppSidebar({ collapsed = false, onToggleCollapsed, drawer = false, onClose }: AppSidebarProps) {
  if (drawer) {
    return <SidebarBody collapsed={false} onToggleCollapsed={onToggleCollapsed} drawer onClose={onClose} />;
  }

  return (
    <aside className={cn("sticky top-20 z-30 hidden h-[calc(100vh-5rem)] shrink-0 lg:block", collapsed ? "w-[76px]" : "w-64")}>
      <div className="flex h-full flex-col overflow-hidden border-r border-slate-800 bg-slate-950 transition-[width] duration-200">
        <SidebarBody collapsed={collapsed} onToggleCollapsed={onToggleCollapsed} onClose={onClose} />
      </div>
    </aside>
  );
}

function SidebarBody({
  collapsed,
  onToggleCollapsed,
  drawer = false,
  onClose,
}: {
  collapsed: boolean;
  onToggleCollapsed?: () => void;
  drawer?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { currentUser, role, hasPermission, isAuthenticated } = useAuth();
  const { conflicts, properties } = useGIS();

  const openConflicts = conflicts.filter((c) => c.status !== "Resolved").length;
  const pendingVerifications = properties.filter((p) =>
    PENDING_PROPERTY_STATUSES.includes(p.verificationStatus),
  ).length;

  const badgeFor = (badge?: string): number | null => {
    if (badge === "conflicts") return openConflicts;
    if (badge === "verification") return pendingVerifications;
    return null;
  };

  const roleLabel =
    role === "OFFICER" ? "Revenue Officer" : role === "ADMIN" ? "Society Secretary" : "Verified Citizen";

  const CollapseControl = () => {
    if (drawer) {
      return (
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-900 hover:text-white"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      );
    }
    return (
      <button
        onClick={onToggleCollapsed}
        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-900 hover:text-white"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand" : "Collapse"}
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
      </button>
    );
  };

  return (
    <>
      {/* Header — brand + collapse/close */}
      <div className={cn("flex items-center gap-2.5 border-b border-slate-800 px-4 py-4", collapsed && "justify-center px-2")}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl overflow-hidden border border-cyan-500/40 bg-slate-950 shadow-tech-cyan">
          <img src="/logo.jpeg" alt="CyberSpark Logo" className="h-full w-full object-cover" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold tracking-tight text-white">BHU-VERIFY</p>
            <p className="truncate font-mono text-[9px] uppercase tracking-widest text-cyan-400">
              3D ULPIN · Vertical Cadastre
            </p>
          </div>
        )}
        <span className={cn(drawer ? "ml-auto" : "ml-auto", collapsed && "hidden")}>
          <CollapseControl />
        </span>
      </div>
      {/* Navigation sections — permission-filtered (Phase 10 RBAC-aware) */}
      <nav className="sidebar-scroll flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Primary">
        {NAV_SECTIONS.map((section) => {
          if (section.permission && !hasPermission(section.permission)) return null;
          const items = section.items.filter((item) => !item.permission || hasPermission(item.permission));
          if (items.length === 0) return null;
          return (
          <div key={section.id}>
            {!collapsed && (
              <p className="mb-1.5 px-2.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">
                {section.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                const active = isNavItemActive(pathname, item);
                const badge = badgeFor(item.badge);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={drawer ? onClose : undefined}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-xs font-semibold tracking-tight transition-colors",
                        collapsed && "justify-center px-0",
                        active
                          ? "bg-gradient-to-r from-cyan-500/20 to-blue-600/10 text-cyan-300"
                          : "text-slate-400 hover:bg-slate-900 hover:text-white",
                      )}
                    >
                      {active && !collapsed && (
                        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-cyan-400" />
                      )}
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          active ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300",
                        )}
                      />
                      {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                      {!collapsed && badge !== null && badge > 0 && (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold",
                            active ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-800 text-slate-400",
                          )}
                        >
                          {badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          );
        })}
      </nav>

      {/* User / officer section */}
      {isAuthenticated && currentUser && currentUser.name !== 'Guest' && (
        <div className="border-t border-slate-800 p-3">
          {drawer && (
            <div className="mb-3 flex justify-center">
              <RoleSwitcher />
            </div>
          )}
          <div className={cn("flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-2.5", collapsed && "justify-center")}>
            <SafeImage
              src={currentUser.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"}
              alt={currentUser.name}
              className="h-9 w-9 shrink-0 rounded-xl object-cover ring-2 ring-cyan-500/40"
            />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold text-white">{currentUser.name}</p>
                <p className="flex items-center gap-1 truncate text-[10px] font-medium text-cyan-400">
                  <ShieldCheck className="h-2.5 w-2.5 shrink-0" />
                  {roleLabel}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}