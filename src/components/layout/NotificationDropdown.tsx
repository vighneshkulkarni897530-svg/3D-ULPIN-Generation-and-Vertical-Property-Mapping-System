"use client";

import * as React from "react";
import { Bell, CheckCheck, ShieldAlert, FileCheck2, Sparkles, Lock } from "lucide-react";
import { useProperty } from "@/context/PropertyContext";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { cn, timeAgo } from "@/lib/utils";

/** Role-aware notification dropdown with mark-as-read simulation. */
export function NotificationDropdown({ className }: { className?: string }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const { notifications, unreadNotificationsCount, markNotificationAsRead, markAllNotificationsAsRead } =
    useProperty();
  const { role } = useAuth();

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const visibleNotifications = notifications.slice(0, 6);
  const typeIcon: Record<string, React.ReactNode> = {
    VERIFICATION: <FileCheck2 className="h-3.5 w-3.5 text-green-400" />,
    DISPUTE: <ShieldAlert className="h-3.5 w-3.5 text-red-400" />,
    FIELD_INSPECTION: <Sparkles className="h-3.5 w-3.5 text-cyan-400" />,
    SECURITY: <Lock className="h-3.5 w-3.5 text-amber-400" />,
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500/50 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadNotificationsCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[9px] font-extrabold text-slate-950 ring-2 ring-slate-950">
            {unreadNotificationsCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[20rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl animate-slide-in-top">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-cyan-400" />
              <h4 className="text-xs font-extrabold text-white tracking-tight">Notifications</h4>
              <span className="rounded-full bg-cyan-500/20 border border-cyan-500/40 px-1.5 py-0.5 text-[9px] font-bold text-cyan-300">
                {unreadNotificationsCount} new
              </span>
            </div>
            <button
              onClick={() => markAllNotificationsAsRead()}
              className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:underline"
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {visibleNotifications.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-500">No notifications yet.</p>
            ) : (
              visibleNotifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => markNotificationAsRead(notif.id)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-900/70",
                    !notif.isRead && "bg-cyan-950/20"
                  )}
                >
                  <span className="mt-0.5 shrink-0">{typeIcon[notif.type] ?? <Bell className="h-3.5 w-3.5 text-slate-400" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white truncate">{notif.title}</span>
                      <span className="shrink-0 text-[9px] text-slate-500 font-mono">{timeAgo(notif.createdAt)}</span>
                    </span>
                    <span className="block text-[11px] text-slate-400 leading-relaxed line-clamp-2">{notif.message}</span>
                    {notif.linkUrl && (
                      <Link
                        href={notif.linkUrl}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 inline-block text-[10px] font-bold text-cyan-400 hover:underline"
                      >
                        View details →
                      </Link>
                    )}
                  </span>
                  {!notif.isRead && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />}
                </button>
              ))
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-slate-800 px-4 py-2.5 text-center text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}