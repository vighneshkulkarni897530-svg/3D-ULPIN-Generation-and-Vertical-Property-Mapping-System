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
  type LucideIcon,
} from 'lucide-react';

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
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'platform',
    label: 'Platform',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, match: ['/dashboard'] },
      { label: '3D Map', href: '/map', icon: Box, match: ['/map'] },
      { label: 'Properties', href: '/properties', icon: Building2, match: ['/properties'] },
      { label: 'Buildings', href: '/buildings', icon: Building, match: ['/buildings'] },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      {
        label: 'Floor Explorer',
        href: '/floors',
        icon: Layers,
        customActive: (p) =>
          p.startsWith('/floors') || /^\/buildings\/[^/]+\/floors(\/|$)/.test(p),
      },
      { label: 'AI Extraction', href: '/ai-extraction', icon: ScanLine, match: ['/ai-extraction'] },
      {
        label: 'Verification',
        href: '/verification',
        icon: ShieldCheck,
        match: ['/verification'],
        badge: 'verification',
      },
      {
        label: 'Conflicts',
        href: '/conflicts',
        icon: AlertTriangle,
        match: ['/conflicts'],
        badge: 'conflicts',
      },
    ],
  },
  {
    id: 'management',
    label: 'Management',
    items: [
      { label: 'Reports', href: '/reports', icon: BarChart3, match: ['/reports'] },
      { label: 'Settings', href: '/settings', icon: Settings, match: ['/settings'] },
    ],
  },
  {
    id: 'services',
    label: 'Public Services',
    items: [
      { label: 'Report Dispute', href: '/disputes/new', icon: AlertCircle, match: ['/disputes'] },
      {
        label: 'Field Verification',
        href: '/field-verification/request',
        icon: ClipboardCheck,
        match: ['/field-verification'],
      },
      { label: 'Notifications', href: '/notifications', icon: Bell, match: ['/notifications'] },
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