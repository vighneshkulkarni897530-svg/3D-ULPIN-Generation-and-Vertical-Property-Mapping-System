'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import { Shield, User as UserIcon, Building2, Check, Lock } from 'lucide-react';
import { RoleAuthModal } from '@/components/auth/RoleAuthModal';

export const RoleSwitcher: React.FC = () => {
  const { role, currentUser } = useAuth();
  const [authModalRole, setAuthModalRole] = useState<UserRole | null>(null);

  const roles: {
    key: UserRole;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    desc: string;
    dashboardUrl: string;
  }[] = [
    {
      key: 'CITIZEN',
      label: 'Citizen',
      icon: UserIcon,
      color: 'from-cyan-500 to-blue-600',
      desc: 'Property portfolio, 3D maps & disputes',
      dashboardUrl: '/dashboard/citizen',
    },
    {
      key: 'OFFICER',
      label: 'Govt Officer',
      icon: Shield,
      color: 'from-emerald-500 to-teal-700',
      desc: 'Field verification & periodic seal approvals',
      dashboardUrl: '/dashboard/officer',
    },
    {
      key: 'ADMIN',
      label: 'Society Secretary',
      icon: Building2,
      color: 'from-indigo-500 to-purple-700',
      desc: 'Building registration & periodic renewals',
      dashboardUrl: '/dashboard/admin',
    },
  ];

  const handleRoleClick = (targetRole: UserRole, dashboardUrl: string) => {
    if (role === targetRole) {
      // Already active, navigate to dashboard if desired
      window.location.href = dashboardUrl;
      return;
    }
    // "No one should login as anyone" — require official authentication form!
    setAuthModalRole(targetRole);
  };

  return (
    <>
      <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 p-1 rounded-full shadow-inner backdrop-blur-md">
        {roles.map((r) => {
          const Icon = r.icon;
          const isActive = role === r.key;
          return (
            <button
              key={r.key}
              onClick={() => handleRoleClick(r.key, r.dashboardUrl)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-tech-cyan font-bold scale-[1.02]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
              title={
                isActive
                  ? `Active Persona: ${r.label}`
                  : `Authenticate as ${r.label} (Official Credentials Required)`
              }
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
              <span>{r.label}</span>
              {isActive ? (
                <Check className="w-3 h-3 text-slate-950 stroke-[3]" />
              ) : (
                <Lock className="w-2.5 h-2.5 text-slate-500 opacity-60" />
              )}
            </button>
          );
        })}
      </div>

      {/* Official Role Authentication Modal */}
      <RoleAuthModal
        isOpen={authModalRole !== null}
        onClose={() => setAuthModalRole(null)}
        targetRole={authModalRole}
      />
    </>
  );
};
