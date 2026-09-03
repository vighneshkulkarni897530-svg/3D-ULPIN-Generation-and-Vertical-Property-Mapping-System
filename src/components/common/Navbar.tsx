'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useProperty } from '@/context/PropertyContext';
import { RoleSwitcher } from './RoleSwitcher';
import { UserMenu } from '@/components/auth/UserMenu';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { SystemStatus } from '@/components/layout/SystemStatus';
import {
  Building, Search, Layers, AlertCircle, FileCheck2, LayoutDashboard, Bell, Menu, X, CheckCheck,
} from 'lucide-react';

interface NavbarProps {
  /** `full` → legacy layout (auth / digital twin) unchanged; `shell` → app shell top bar. */
  variant?: 'full' | 'shell';
  onToggleMobileNav?: () => void;
  mobileNavOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  variant = 'full',
  onToggleMobileNav,
  mobileNavOpen = false,
}) => {
  const pathname = usePathname();
  const { role, isAuthenticated } = useAuth();
  const { notifications, unreadNotificationsCount, markAllNotificationsAsRead, markNotificationAsRead } =
    useProperty();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const isShell = variant === 'shell';
  const isAuthPage = pathname?.startsWith('/auth');
  const isActuallyLoggedIn = isAuthenticated && !isAuthPage && !!role;

  const getDashboardLink = () => {
    if (role === 'OFFICER') return '/dashboard/officer';
    if (role === 'ADMIN') return '/dashboard/admin';
    return '/dashboard/citizen';
  };

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Search Registry', href: '/properties', icon: Search },
    { label: '3D & 2D Cadastre', href: '/properties/prop-blr-001', icon: Layers },
    { label: 'Report Dispute', href: '/disputes/new', icon: AlertCircle },
    { label: 'Field Verification', href: '/field-verification/request', icon: FileCheck2 },
    ...(isActuallyLoggedIn ? [{ label: 'My Dashboard', href: getDashboardLink(), icon: LayoutDashboard }] : []),
  ];

  const handleMenuToggle = () => {
    if (isShell) onToggleMobileNav?.();
    else setMobileMenuOpen((o) => !o);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 h-20">
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-900 p-0.5 shadow-tech-cyan group-hover:scale-105 transition-transform duration-200 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] overflow-hidden flex items-center justify-center">
                <img src="/logo.jpeg" alt="CyberSpark BHU-VERIFY" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-cyan-400">
                  BHU-VERIFY
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  ULPIN 3.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium tracking-wide">
                Smart Cadastre & Property Verification
              </p>
            </div>
          </Link>

          {isShell ? (
            <div className="flex-1 min-w-0 flex justify-center px-1 sm:px-3">
              <div className="w-full max-w-[26rem]">
                <GlobalSearch />
              </div>
            </div>
          ) : (
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all duration-150 ${
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-inner'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                    }`}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5 text-cyan-400/80" />}
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}
          {/* Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {isShell && <SystemStatus />}

            <div className="hidden md:flex items-center gap-2.5">
              {isActuallyLoggedIn && <RoleSwitcher />}
            </div>

            {/* Notifications */}
            {isActuallyLoggedIn && (
              <div className="relative">
                <button
                  onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                  className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-slate-700 transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-slate-950 animate-bounce">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 top-12 z-50 w-[21rem] sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-slide-in-top">
                  <div className="flex items-center justify-between p-3.5 bg-slate-950 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Cadastral Alerts ({unreadNotificationsCount} Unread)
                      </h4>
                    </div>
                    {unreadNotificationsCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                    {notifications.slice(0, 5).map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => markNotificationAsRead(notif.id)}
                        className={`p-3.5 hover:bg-slate-800/60 transition-colors cursor-pointer ${
                          !notif.isRead ? 'bg-cyan-950/20' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-white">{notif.title}</p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">{notif.createdAt}</span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">{notif.message}</p>
                        {notif.linkUrl && (
                          <Link
                            href={notif.linkUrl}
                            onClick={() => setNotifDropdownOpen(false)}
                            className="inline-block mt-2 text-[11px] text-cyan-400 hover:underline font-medium"
                          >
                            View Details &rarr;
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

            {/* User menu (Phase 10): profile, admin links, sign out — or sign-in/register when signed out */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
              <UserMenu />
            </div>

            {/* Hamburger (opens shell drawer on mobile/tablet) */}
            <button
              onClick={handleMenuToggle}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 lg:hidden"
              aria-label="Toggle navigation menu"
            >
              {isShell
                ? mobileNavOpen
                  ? <X className="w-5 h-5" />
                  : <Menu className="w-5 h-5" />
                : mobileMenuOpen
                  ? <X className="w-5 h-5" />
                  : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {!isShell && mobileMenuOpen && (
        <div className="lg:hidden bg-slate-950 border-b border-slate-800 px-4 pt-2 pb-6 space-y-3">
          <nav className="flex flex-col gap-1.5 pt-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-semibold ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4 text-cyan-400" />}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
};