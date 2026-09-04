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
  ShieldCheck,
  AlertTriangle,
  BarChart3,
  Settings,
  AlertCircle,
  ClipboardCheck,
  Bell,
  Users,
  History,
  Clock,
  Home,
  Landmark,
  Scale,
  FileSearch,
  ScanLine,
  type LucideIcon,
} from 'lucide-react';
import { PERMISSIONS, type Permission } from '@/types/auth';

export { ScanLine };

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Path prefixes that should keep this item active. */
  match?: string[];
  /** Custom matcher for hierarchically tricky routes (e.g. floors). */
  customActive?: (pathname: string) => boolean;
  /** Sidebar renders a live count badge for this item. */
  badge?: 'conflicts' | 'verification' | 'notifications';
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
      { label: 'Dashboard', href: '/dashboard/citizen', icon: LayoutDashboard, match: ['/dashboard'] },
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
    id: 'personal',
    label: 'Personal',
    items: [
      { label: 'My Residency', href: '/resident/dashboard', icon: Home, match: ['/resident/dashboard'] },
      { label: 'My Property', href: '/resident/property', icon: Building2, match: ['/resident/property'] },
      { label: 'My Cases', href: '/resident/cases', icon: Scale, match: ['/resident/cases'] },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { label: 'Notifications', href: '/notifications', icon: Bell, match: ['/notifications'] },
      { label: 'Report Dispute', href: '/disputes/new', icon: AlertCircle, match: ['/disputes'] },
    ],
  },
  {
    id: 'analytics',
    label: 'Reports',
    items: [
      { label: 'Reports', href: '/reports', icon: BarChart3, match: ['/reports'] },
    ],
  },
];

/**
 * Dynamic role-based navigation sections.
 * Returns the exact tailored navigation tree for:
 *   - Citizen (Property & GIS, Personal, Operations, Reports)
 *   - Society Admin / Secretary (Property & GIS, Management, Reports & Settings)
 *   - Government Officer (Property & GIS, Verification & Cases, Analytics & Reports)
 *   - Cadastre Admin (Property & GIS, Administration & Cadastre)
 */
export function getNavSectionsForRole(role?: string | null): NavSection[] {
  if (role === 'OFFICER') {
    return [
      {
        id: 'platform',
        label: 'Property & GIS',
        items: [
          { label: 'Dashboard', href: '/dashboard/officer', icon: LayoutDashboard, match: ['/dashboard'] },
          { label: '3D Map', href: '/map', icon: Box, match: ['/map'] },
          { label: 'Properties', href: '/properties', icon: Building2, match: ['/properties'] },
          { label: 'Society', href: '/government/societies', icon: Landmark, match: ['/government/societies', '/society'] },
          { label: 'Buildings', href: '/buildings', icon: Building, match: ['/buildings'] },
          {
            label: 'Floor Explorer',
            href: '/floors',
            icon: Layers,
            customActive: (p) => p.startsWith('/floors') || /^\/buildings\/[^/]+\/floors(\/|$)/.test(p),
          },
        ],
      },
      {
        id: 'verification',
        label: 'Verification & Cases',
        items: [
          { label: 'Verification', href: '/verification', icon: ShieldCheck, match: ['/verification'], badge: 'verification' },
          { label: 'Field Verification', href: '/field-verification/request', icon: ClipboardCheck, match: ['/field-verification', '/verification/field'] },
          { label: 'Disputes', href: '/conflicts', icon: AlertTriangle, match: ['/conflicts', '/disputes'], badge: 'conflicts' },
          { label: 'Evidence', href: '/government/ai-analysis', icon: FileSearch, match: ['/government/ai-analysis'] },
          { label: 'Notifications', href: '/notifications', icon: Bell, match: ['/notifications'] },
        ],
      },
      {
        id: 'analytics',
        label: 'Analytics & Reports',
        items: [
          { label: 'Gov Analytics', href: '/government/analytics', icon: Landmark, match: ['/government/analytics'] },
          { label: 'Reports', href: '/reports', icon: BarChart3, match: ['/reports'] },
        ],
      },
    ];
  }

  if (role === 'ADMIN') {
    return [
      {
        id: 'platform',
        label: 'Property & GIS',
        items: [
          { label: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard, match: ['/dashboard'] },
          { label: '3D Map', href: '/map', icon: Box, match: ['/map'] },
          { label: 'Properties', href: '/properties', icon: Building2, match: ['/properties'] },
          { label: 'Society', href: '/society', icon: Landmark, match: ['/society'] },
          { label: 'Buildings', href: '/buildings', icon: Building, match: ['/buildings'] },
          {
            label: 'Floor Explorer',
            href: '/floors',
            icon: Layers,
            customActive: (p) => p.startsWith('/floors') || /^\/buildings\/[^/]+\/floors(\/|$)/.test(p),
          },
        ],
      },
      {
        id: 'management',
        label: 'Management',
        items: [
          { label: 'Residents', href: '/resident/dashboard', icon: Users, match: ['/resident/dashboard'] },
          { label: 'Requests', href: '/resident/pending', icon: Clock, match: ['/resident/pending'] },
          { label: 'Notifications', href: '/notifications', icon: Bell, match: ['/notifications'] },
        ],
      },
      {
        id: 'reports_settings',
        label: 'Reports & Settings',
        items: [
          { label: 'Reports', href: '/reports', icon: BarChart3, match: ['/reports'] },
          { label: 'Settings', href: '/settings', icon: Settings, match: ['/settings'] },
        ],
      },
    ];
  }

  if (role === 'SUPER_ADMIN') {
    return [
      {
        id: 'platform',
        label: 'Property & GIS',
        items: [
          { label: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard, match: ['/dashboard'] },
          { label: '3D Map', href: '/map', icon: Box, match: ['/map'] },
          { label: 'Properties', href: '/properties', icon: Building2, match: ['/properties'] },
          { label: 'Societies', href: '/government/societies', icon: Landmark, match: ['/government/societies', '/society'] },
          { label: 'Buildings', href: '/buildings', icon: Building, match: ['/buildings'] },
          {
            label: 'Floor Explorer',
            href: '/floors',
            icon: Layers,
            customActive: (p) => p.startsWith('/floors') || /^\/buildings\/[^/]+\/floors(\/|$)/.test(p),
          },
        ],
      },
      {
        id: 'administration',
        label: 'Administration & Cadastre',
        items: [
          { label: 'Verification', href: '/verification', icon: ShieldCheck, match: ['/verification'] },
          { label: 'Disputes', href: '/conflicts', icon: AlertTriangle, match: ['/conflicts'] },
          { label: 'Officers', href: '/admin/users', icon: ShieldCheck, match: ['/admin/users'] },
          { label: 'Users', href: '/admin/users', icon: Users, match: ['/admin/users'] },
          { label: 'Audit Logs', href: '/admin/audit-log', icon: History, match: ['/admin/audit-log'] },
          { label: 'Reports', href: '/reports', icon: BarChart3, match: ['/reports'] },
          { label: 'System Settings', href: '/settings', icon: Settings, match: ['/settings'] },
        ],
      },
    ];
  }

  // Default: CITIZEN
  return [
    {
      id: 'platform',
      label: 'Property & GIS',
      items: [
        { label: 'Dashboard', href: '/dashboard/citizen', icon: LayoutDashboard, match: ['/dashboard'] },
        { label: '3D Map', href: '/map', icon: Box, match: ['/map'] },
        { label: 'Properties', href: '/properties', icon: Building2, match: ['/properties'] },
        { label: 'Buildings', href: '/buildings', icon: Building, match: ['/buildings'] },
        {
          label: 'Floor Explorer',
          href: '/floors',
          icon: Layers,
          customActive: (p) => p.startsWith('/floors') || /^\/buildings\/[^/]+\/floors(\/|$)/.test(p),
        },
      ],
    },
    {
      id: 'personal',
      label: 'Personal',
      items: [
        { label: 'My Residency', href: '/resident/dashboard', icon: Home, match: ['/resident/dashboard'] },
        { label: 'My Property', href: '/resident/property', icon: Building2, match: ['/resident/property'] },
        { label: 'My Cases', href: '/resident/cases', icon: Scale, match: ['/resident/cases'] },
      ],
    },
    {
      id: 'operations',
      label: 'Operations',
      items: [
        { label: 'Notifications', href: '/notifications', icon: Bell, match: ['/notifications'] },
        { label: 'Report Dispute', href: '/disputes/new', icon: AlertCircle, match: ['/disputes'] },
      ],
    },
    {
      id: 'analytics',
      label: 'Reports',
      items: [
        { label: 'Reports', href: '/reports', icon: BarChart3, match: ['/reports'] },
      ],
    },
  ];
}

/**
 * Active-state resolution used by the sidebar.
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