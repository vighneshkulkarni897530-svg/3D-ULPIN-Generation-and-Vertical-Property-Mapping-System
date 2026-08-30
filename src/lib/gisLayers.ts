/**
 * GIS Workspace Layer Configuration
 * ===================================
 * The layer-visibility model shared by the 2D map, 3D viewer and the left
 * panel's layer controls. Layers are real toggles — every one of them drives
 * whether the corresponding geometry is rendered.
 */

export interface LayerState {
  /** Land parcel polygons. */
  parcels: boolean;
  /** Building footprints. */
  buildings: boolean;
  /** Property unit markers. */
  units: boolean;
  /** Property unit boundary rectangles. */
  boundaries: boolean;
  /** Spatial conflict polygons. */
  conflicts: boolean;
  /** Street labels overlay. */
  labels: boolean;
  /** Satellite base imagery (Esri demo tiles) instead of OSM streets. */
  satellite: boolean;
  /** Demo road network overlay connecting the survey clusters. */
  roads: boolean;
}

export const DEFAULT_LAYERS: LayerState = {
  parcels: true,
  buildings: true,
  units: true,
  boundaries: false,
  conflicts: true,
  labels: false,
  satellite: false,
  roads: true,
};

export const LAYER_META: Array<{ key: keyof LayerState; label: string; icon: string; desc: string }> = [
  { key: 'parcels', label: 'Land Parcels', icon: '▰', desc: 'Cadastral parcel boundaries' },
  { key: 'buildings', label: 'Building Footprints', icon: '▧', desc: 'Surveyed building footprints' },
  { key: 'units', label: 'Property Units', icon: '●', desc: 'Vertical unit centroids' },
  { key: 'boundaries', label: 'Property Boundaries', icon: '▭', desc: 'Unit-level cadastral envelopes' },
  { key: 'conflicts', label: 'Spatial Conflicts', icon: '▲', desc: 'GIS-detected conflict zones' },
  { key: 'satellite', label: 'Satellite / Base Map', icon: '🛰', desc: 'Esri World Imagery demo tiles' },
  { key: 'roads', label: 'Roads', icon: '╳', desc: 'Demo access-road overlay' },
  { key: 'labels', label: 'Labels', icon: 'Aa', desc: 'Street labels overlay' },
];

// ── Semantic colours (status → hex) used by map, 3D, legend & panels ──

export interface StatusColor {
  fill: string;
  stroke: string;
  label: string;
}

export const PARCEL_COLORS: Record<string, StatusColor> = {
  ACTIVE: { fill: 'rgba(16,185,129,0.16)', stroke: '#10B981', label: 'Active parcel' },
  DISPUTED: { fill: 'rgba(239,68,68,0.18)', stroke: '#EF4444', label: 'Disputed parcel' },
  INACTIVE: { fill: 'rgba(100,116,139,0.16)', stroke: '#94A3B8', label: 'Inactive parcel' },
  default: { fill: 'rgba(148,163,184,0.14)', stroke: '#64748B', label: 'Parcel' },
};

export const BUILDING_COLORS: Record<string, StatusColor> = {
  ACTIVE: { fill: 'rgba(59,130,246,0.18)', stroke: '#3B82F6', label: 'Active building' },
  UNDER_CONSTRUCTION: { fill: 'rgba(245,158,11,0.16)', stroke: '#F59E0B', label: 'Under construction' },
  INACTIVE: { fill: 'rgba(100,116,139,0.14)', stroke: '#94A3B8', label: 'Inactive building' },
  default: { fill: 'rgba(100,116,139,0.16)', stroke: '#64748B', label: 'Building' },
};

export const UNIT_COLORS: Record<string, StatusColor> = {
  Verified: { fill: '#22C55E', stroke: '#15803D', label: 'Verified' },
  Pending: { fill: '#F59E0B', stroke: '#B45309', label: 'Pending' },
  'Under Review': { fill: '#3B82F6', stroke: '#1D4ED8', label: 'Under review' },
  'Reinspection Required': { fill: '#F97316', stroke: '#C2410C', label: 'Reinspection' },
  Rejected: { fill: '#EF4444', stroke: '#B91C1C', label: 'Rejected' },
  default: { fill: '#94A3B8', stroke: '#64748B', label: 'Unit' },
};

export const CONFLICT_COLORS: Record<string, StatusColor> = {
  Critical: { fill: 'rgba(239,68,68,0.30)', stroke: '#DC2626', label: 'Critical' },
  High: { fill: 'rgba(249,115,22,0.26)', stroke: '#EA580C', label: 'High' },
  Medium: { fill: 'rgba(245,158,11,0.26)', stroke: '#D97706', label: 'Medium' },
  Low: { fill: 'rgba(234,179,8,0.24)', stroke: '#CA8A04', label: 'Low' },
  default: { fill: 'rgba(100,116,139,0.2)', stroke: '#64748B', label: 'Conflict' },
};

export function statusColor(map: Record<string, StatusColor>, status: string): StatusColor {
  return map[status] ?? map.default ?? map.default;
}