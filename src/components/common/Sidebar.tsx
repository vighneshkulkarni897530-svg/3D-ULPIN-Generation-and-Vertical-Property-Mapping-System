'use client';

import { SafeImage } from '@/components/ui/SafeImage';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, 
  Building2, 
  AlertCircle, 
  FileCheck2, 
  Bell, 
  Settings, 
  Users, 
  FileText, 
  ShieldCheck, 
  BarChart3, 
  History, 
  Search,
  LogOut,
  Map
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { role, currentUser } = useAuth();

  const citizenNav = [
    { label: 'Citizen Hub', href: '/dashboard/citizen', icon: LayoutDashboard },
    { label: 'My Properties', href: '/properties', icon: Building2 },
    { label: 'Verify ULPIN', href: '/properties', icon: Search },
    { label: 'Disputes Raised', href: '/disputes', icon: AlertCircle },
    { label: 'Field Surveys', href: '/field-verification/request', icon: FileCheck2 },
    { label: 'Notifications', href: '/notifications', icon: Bell },
  ];

  const officerNav = [
    { label: 'Officer Portal', href: '/dashboard/officer', icon: LayoutDashboard },
    { label: 'Assigned Inspections', href: '/dashboard/officer?tab=inspections', icon: FileCheck2 },
    { label: 'Boundary Disputes', href: '/disputes', icon: AlertCircle },
    { label: 'Cadastral GIS Verification', href: '/properties/prop-blr-001', icon: Map },
    { label: 'Approval Queue', href: '/dashboard/officer?tab=approvals', icon: ShieldCheck },
    { label: 'Notifications', href: '/notifications', icon: Bell },
  ];

  const adminNav = [
    { label: 'Admin Command', href: '/dashboard/admin', icon: LayoutDashboard },
    { label: 'Cadastre Registry', href: '/properties', icon: Building2 },
    { label: 'Manage Officers', href: '/dashboard/admin?tab=officers', icon: Users },
    { label: 'Dispute Analytics', href: '/dashboard/admin?tab=disputes', icon: BarChart3 },
    { label: 'System Audit Logs', href: '/dashboard/admin?tab=audit', icon: History },
    { label: 'Alerts & Broadcasts', href: '/notifications', icon: Bell },
  ];

  const currentNav = role === 'OFFICER' ? officerNav : role === 'ADMIN' ? adminNav : citizenNav;

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 text-slate-300 min-h-[calc(100vh-5rem)] flex flex-col justify-between p-4 shrink-0 hidden md:flex">
      <div className="space-y-6">
        {/* User Identity Mini Card */}
        <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 flex items-center gap-3">
          <SafeImage
            src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
            alt={currentUser.name}
            className="w-10 h-10 rounded-xl object-cover ring-2 ring-cyan-500/40"
          />
          <div className="overflow-hidden">
            <h5 className="text-xs font-bold text-white truncate">{currentUser.name}</h5>
            <span className="text-[10px] font-semibold text-cyan-400 block truncate">
              {role === 'OFFICER' ? 'Revenue Officer' : role === 'ADMIN' ? 'Cadastre Admin' : 'Verified Citizen'}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
            Main Menu
          </p>
          {currentNav.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-cyan-300 border border-cyan-500/40 shadow-inner'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Info Banner */}
      <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800/80 text-[11px] space-y-1 text-slate-400">
        <p className="font-semibold text-slate-300">National Cadastre Portal</p>
        <p className="text-[10px] text-slate-500">ULPIN Bhu-Aadhaar v3.4 Engine</p>
      </div>
    </aside>
  );
};
