'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import { Shield, User as UserIcon, Building2, Check } from 'lucide-react';
import Link from 'next/link';

export const RoleSwitcher: React.FC = () => {
  const { role, setRole, currentUser } = useAuth();

  const roles: { key: UserRole; label: string; icon: React.ComponentType<{ className?: string }>; color: string; desc: string; dashboardUrl: string }[] = [
    {
      key: 'CITIZEN',
      label: 'Citizen',
      icon: UserIcon,
      color: 'from-cyan-500 to-blue-600',
      desc: 'Search, verify & raise disputes',
      dashboardUrl: '/dashboard/citizen',
    },
    {
      key: 'OFFICER',
      label: 'Govt Officer',
      icon: Shield,
      color: 'from-emerald-500 to-teal-700',
      desc: 'Field inspection & verification approvals',
      dashboardUrl: '/dashboard/officer',
    },
    {
      key: 'ADMIN',
      label: 'Cadastre Admin',
      icon: Building2,
      color: 'from-indigo-500 to-purple-700',
      desc: 'System analytics & audit logs',
      dashboardUrl: '/dashboard/admin',
    },
  ];

  return (
    <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 p-1 rounded-full shadow-inner backdrop-blur-md">
      {roles.map((r) => {
        const Icon = r.icon;
        const isActive = role === r.key;
        return (
          <button
            key={r.key}
            onClick={() => setRole(r.key)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              isActive
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-tech-cyan font-bold scale-[1.02]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
            title={`Switch to ${r.label} Persona (${r.desc})`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
            <span>{r.label}</span>
            {isActive && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
          </button>
        );
      })}
    </div>
  );
};
