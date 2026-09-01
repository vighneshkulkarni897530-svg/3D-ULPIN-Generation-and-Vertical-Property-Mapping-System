'use client';

import React from 'react';
import { VerificationStatus, DisputeStatus } from '@/types';
import { CheckCircle2, Clock, AlertTriangle, XCircle, ShieldCheck, HelpCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: VerificationStatus | DisputeStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  size = 'md',
  showIcon = true 
}) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'VERIFIED':
      case 'RESOLVED':
      case 'COMPLETED':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-emerald-500/20',
          dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]',
          label: status === 'RESOLVED' ? 'Resolved' : 'Verified Bhu-Aadhaar',
          icon: CheckCircle2,
        };

      case 'UNDER_REVIEW':
      case 'UNDER_INVESTIGATION':
      case 'IN_PROGRESS':
      case 'VERIFICATION_IN_PROGRESS':
      case 'OFFICER_ASSIGNED':
      case 'SCHEDULED':
        return {
          bg: 'bg-cyan-50 text-cyan-800 border-cyan-300 ring-cyan-500/20',
          dot: 'bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.6)]',
          label: status === 'UNDER_INVESTIGATION' 
            ? 'Under Investigation' 
            : status === 'OFFICER_ASSIGNED' 
            ? 'Officer Assigned'
            : status === 'SCHEDULED'
            ? 'Survey Scheduled'
            : 'Under Review',
          icon: ShieldCheck,
        };

      case 'SUBMITTED':
      case 'PENDING_ASSIGNMENT':
      case 'OPEN':
      case 'FIELD_VERIFICATION_REQUESTED':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-300 ring-amber-500/20',
          dot: 'bg-amber-500 animate-pulse',
          label: status === 'FIELD_VERIFICATION_REQUESTED'
            ? 'Field Survey Requested'
            : status === 'OPEN'
            ? 'Dispute Open'
            : 'Pending Verification',
          icon: Clock,
        };

      case 'DISPUTED':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-300 ring-rose-500/20',
          dot: 'bg-rose-600 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.7)]',
          label: 'Dispute Active',
          icon: AlertTriangle,
        };

      case 'REJECTED':
      case 'HEARING_SCHEDULED':
        return {
          bg: status === 'HEARING_SCHEDULED' ? 'bg-purple-50 text-purple-800 border-purple-300' : 'bg-red-50 text-red-800 border-red-300',
          dot: status === 'HEARING_SCHEDULED' ? 'bg-purple-500' : 'bg-red-500',
          label: status === 'HEARING_SCHEDULED' ? 'Hearing Scheduled' : 'Rejected / Correction Req.',
          icon: status === 'HEARING_SCHEDULED' ? HelpCircle : XCircle,
        };

      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          dot: 'bg-slate-400',
          label: status.replace(/_/g, ' '),
          icon: HelpCircle,
        };
    }
  };

  const config = getBadgeConfig();
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs px-3 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-sm ${config.bg} ${sizeClasses[size]} tracking-tight transition-all duration-200`}
    >
      <span className={`rounded-full ${config.dot} ${dotSizes[size]}`} />
      {showIcon && <IconComponent className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />}
      <span>{config.label}</span>
    </span>
  );
};
