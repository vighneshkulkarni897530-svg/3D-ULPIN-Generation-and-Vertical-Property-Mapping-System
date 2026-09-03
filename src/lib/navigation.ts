/**
 * Application Navigation Configuration
 * ======================================
 * Single source of truth for the global sidebar. Sections mirror the
 * professional government GIS platform structure:
 *
 *   Platform    → Dashboard, 3D Map, Properties, Buildings
 *   Operations  → Floor Explorer, AI Extraction, Verification, Conflicts
 *   Management  → Reports, Settings
 *   Services    → legacy public-facing modules (kept fully reachable)
 */
import {
  LayoutDashboard,
  Box,
  Building2,
  Building,
  Layers,
  ScanLine,
  ShieldCheck,
  AlertTriangle,
  BarChart3,
  Settings,
  AlertCircle,
  ClipboardCheck,
  Bell,
  Workflow,
  Users,
  History,
  Clock,
  type LucideIcon,
} from 'lucide-react';
import { PERMISSIONS, type Permission } from '@/types/auth';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Path prefixes that should keep this item active. */
  match?: string[];
  /** Custom matcher for hierarchically tricky routes (e.g. floors). */
  customActive?: (pathname: string) => boolean;
  /** Sidebar renders a live count badge for this item. */
  badge?: 'conflicts' | 'verification';
  /** Permission required to see this item (Phase 10 RBAC-aware nav). */
  permission?: Permission;
}

export interface NavSection {
  id: string;
  label: string;
  /** When set, the whole section is hidden unless the user holds the permission. */
  permission?: Permission;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'platform',
    label: 'Property & GIS',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, match: ['/dashboard'] },
      { label: '3D Map', href: '/map', icon: Box, match: ['#/map', '/map'] },
      { label: 'Properties', href: '/properties', icon: Building2, match: ['/properties'] },
      { label: 'Buildings', href: '/buildings', icon: Building, match: ['/buildings'] },
      {
        label: 'Floor Explorer',
        href: '/floors',
        icon: Layers,
        customActive: (p) =>
          p.startsWith('/floors') || /^\/buildings\/[^/]+\/floors(\/|$)/.test(p),
      },
    ],
  },
  {
    id: 'verification',
    label: 'Verification & Renewal',
    items: [
      {
        label: 'Periodic Verification',
        href: '/renewals',
        icon: Clock,
        match: ['/renewals'],
        permission: PERMISSIONS.MANAGE_SOCIETY_RENEWALS,
      },
      {
        label: 'AI Extraction',
        href: '/ai-extraction',
        icon: ScanLine,
        match: ['/ai-extraction'],
        permission: PERMISSIONS.RUN_SPATIAL_VALIDATION,
      },
      {
        label: 'Verification',
        href: '/verification',
        icon: ShieldCheck,
        match: ['/verification'],
        badge: 'verification',
        permission: PERMISSIONS.VIEW_VERIFICATION_QUEUE,
      },
      {
        label: 'Field Verification',
        href: '/field-verification/request',
        icon: ClipboardCheck,
        match: ['/field-verification'],
        permission: PERMISSIONS.SEND_TO_FIELD_VERIFICATION,
      },
      {
        label: 'Conflicts',
        href: '/conflicts',
        icon: AlertTriangle,
        match: ['/conflicts'],
        badge: 'conflicts',
        permission: PERMISSIONS.MANAGE_CONFLICTS,
      },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      {
        label: 'Workflow',
        href: '/workflow',
        icon: Workflow,
        match: ['/workflow'],
        permission: PERMISSIONS.MANAGE_WORKFLOW_TASKS,
      },
      { label: 'Notifications', href: '/notifications', icon: Bell, match: ['/notifications'] },
      { label: 'Report Dispute', href: '/disputes/new', icon: AlertCircle, match: ['/disputes'] },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    items: [
      { label: 'Reports', href: '/reports', icon: BarChart3, match: ['/reports'] },
    ],
  },
  {
    id: 'administration',
    label: 'Society Administration',
    permission: PERMISSIONS.SYSTEM_ADMIN,
    items: [
      {
        label: 'Users',
        href: '/admin/users',
        icon: Users,
        match: ['/admin/users'],
        permission: PERMISSIONS.USER_MANAGEMENT,
      },
      {
        label: 'Audit Log',
        href: '/admin/audit-log',
        icon: History,
        match: ['/admin/audit-log'],
        permission: PERMISSIONS.VIEW_ACTIVITY_LOG,
      },
      {
        label: 'Settings',
        href: '/settings',
        icon: Settings,
        match: ['/settings'],
        permission: PERMISSIONS.SYSTEM_ADMIN,
      },
    ],
  },
];

/**
 * Active-state resolution used by the sidebar.
 *
 * `match` prefixes keep child routes highlighted (e.g. `/properties/PROP-1`
 * keeps "Properties" active). `customActive` covers hierarchical routes such
 * as `/buildings/:id/floors`, which highlights both "Buildings" (via prefix
 * match) and "Floor Explorer" (via the floors-path regex).
 */
export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.customActive) return item.customActive(pathname);
  if (item.match) {
    return item.match.some((m) => {
      if (pathname === m) return true;
      if (m.endsWith('/')) return pathname.startsWith(m);
      return pathname.startsWith(`${m}/`);
    });
  }
  return pathname === item.href;
}