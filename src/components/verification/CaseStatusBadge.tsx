'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  type CaseStatus,
  type DiscrepancySeverity,
  CASE_STATUS_LABELS,
  CASE_STATUS_VARIANTS,
  DISCREPANCY_SEVERITY_LABELS,
  DISCREPANCY_SEVERITY_VARIANTS,
} from '@/types/verificationCase';
import { cn } from '@/lib/utils';

export function CaseStatusBadge({
  status,
  className,
}: {
  status: CaseStatus;
  className?: string;
}) {
  const variant = CASE_STATUS_VARIANTS[status] || 'default';
  const label = CASE_STATUS_LABELS[status] || status;

  return (
    <Badge variant={variant} className={cn('font-bold text-[10px] tracking-wider uppercase', className)}>
      {label}
    </Badge>
  );
}

export function CaseSeverityBadge({
  severity,
  className,
}: {
  severity: DiscrepancySeverity;
  className?: string;
}) {
  const variant = DISCREPANCY_SEVERITY_VARIANTS[severity] || 'secondary';
  const label = DISCREPANCY_SEVERITY_LABELS[severity] || severity;

  return (
    <Badge variant={variant} className={cn('font-mono text-[9px] font-black uppercase tracking-wider', className)}>
      {label}
    </Badge>
  );
}
