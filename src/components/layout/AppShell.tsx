"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/common/Navbar";
import { Footer } from "@/components/common/Footer";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { cn } from "@/lib/utils";

/** Routes that keep the legacy layout — no sidebar, no top-bar controls. */
const CHROMELESS_PREFIXES = ["/auth/"];
/** The Digital Twin keeps its immersive full-screen behaviour untouched. */
const CHROMELESS_SUFFIXES = ["/digital-twin"];

/**
 * Global application shell.
 *
 * Renders the full professional shell (top bar with global search + status,
 * collapsible desktop sidebar, mobile drawer navigation) for every route
 * EXCEPT the legacy-immersive surfaces — auth flows and the Digital Twin —
 * which render exactly as before (Navbar + channel + Footer) so no existing
 * behaviour is disturbed.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const isChromeless =
    CHROMELESS_PREFIXES.some((p) => pathname.startsWith(p)) ||
    CHROMELESS_SUFFIXES.some((s) => pathname.endsWith(s));

  // Close the mobile drawer on navigation.
  React.useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  if (isChromeless) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Navbar variant="full" />
        <main className="flex flex-1 flex-col">{children}</main>
        <Footer />
        <MobileNavigation />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Top bar */}
      <Navbar
        variant="shell"
        onToggleMobileNav={() => setDrawerOpen((o) => !o)}
        mobileNavOpen={drawerOpen}
      />

      {/* Sidebar + content */}
      <div className="flex flex-1 items-stretch">
        <AppSidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((c) => !c)} />
        <main className={cn("min-w-0 flex-1")}>{children}</main>
      </div>

      <Footer />
      <MobileNavigation />

      {/* Mobile / tablet drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="animate-drawer-in absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-slate-800 bg-slate-950 shadow-2xl">
            <AppSidebar drawer onClose={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}