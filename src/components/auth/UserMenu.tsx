'use client';

/**
 * UserMenu (Phase 10)
 * -------------------
 * Navbar user menu: avatar/initials, role badge, links to profile and (for
 * admins) administration screens, and the logout action. When signed out it
 * renders Sign in / Register buttons instead.
 */
import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, User as UserIcon, ShieldCheck, Users, ScrollText, Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/auth/permissions';
import { PERMISSIONS } from '@/types/auth';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';

const ROLE_BADGE: Record<string, string> = {
  CITIZEN: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  OFFICER: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  ADMIN: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || 'U';
}

export const UserMenu: React.FC = () => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const { currentUser, isAuthenticated, authStatus, role, logout, hasPermission: checkPermission } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = React.useState(false);

  const handleLogout = async () => {
    setBusy(true);
    await logout();
    setBusy(false);
    router.push('/auth/login');
  };

  const isAuthPage = pathname?.startsWith('/auth');

  if (!mounted || authStatus === 'initializing') {
    return <div className="h-8 w-8 rounded-full bg-slate-800 animate-pulse" aria-label="Loading session" />;
  }

  // If not logged in OR currently on an authentication page, NEVER display the user's name or avatar
  if (!isAuthenticated || isAuthPage || !currentUser) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/auth/login"
          className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-300 transition-colors hover:bg-cyan-500/20"
        >
          Sign in
        </Link>
        <Link
          href="/auth/register"
          className="hidden rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-tech-cyan sm:inline-flex"
        >
          Register
        </Link>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 py-1 pl-1 pr-2.5 transition-colors hover:border-cyan-500/50"
          aria-label="Account menu"
        >
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="h-7 w-7 rounded-full object-cover ring-1 ring-cyan-500/60"
            />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-700 text-[10px] font-extrabold text-slate-950">
              {initials(currentUser.name)}
            </span>
          )}
          <span className="hidden flex-col items-start leading-tight md:flex">
            <span className="max-w-[120px] truncate text-[11px] font-bold text-slate-200">{currentUser.name}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
              {role === 'ADMIN' ? 'Secretary' : role}
            </span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Signed in</DropdownMenuLabel>
        <div className="px-2.5 pb-2 flex items-center gap-3">
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-cyan-500/50 shadow"
            />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 text-xs font-extrabold text-slate-950">
              {initials(currentUser.name)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-slate-100">{currentUser.name}</p>
            <p className="truncate text-[10px] text-slate-500">{currentUser.email}</p>
            <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${ROLE_BADGE[role] ?? ''}`}>
              <ShieldCheck className="h-2.5 w-2.5" /> {role === 'ADMIN' ? 'Society Secretary' : role}
            </span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="cursor-pointer">
            <UserIcon className="h-3.5 w-3.5" /> My profile
          </Link>
        </DropdownMenuItem>
        {checkPermission(PERMISSIONS.USER_MANAGEMENT) && (
          <DropdownMenuItem asChild>
            <Link href="/admin/users" className="cursor-pointer">
              <Users className="h-3.5 w-3.5" /> User management
            </Link>
          </DropdownMenuItem>
        )}
        {hasPermission(role, PERMISSIONS.VIEW_ACTIVITY_LOG) && (
          <DropdownMenuItem asChild>
            <Link href="/admin/audit-log" className="cursor-pointer">
              <ScrollText className="h-3.5 w-3.5" /> Audit log
            </Link>
          </DropdownMenuItem>
        )}
        {hasPermission(role, PERMISSIONS.SYSTEM_ADMIN) && (
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer">
              <Settings className="h-3.5 w-3.5" /> System settings
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); void handleLogout(); }} className="text-rose-300 focus:bg-rose-500/10 focus:text-rose-200">
          <LogOut className="h-3.5 w-3.5" />
          <span>{busy ? 'Signing out…' : 'Sign out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
