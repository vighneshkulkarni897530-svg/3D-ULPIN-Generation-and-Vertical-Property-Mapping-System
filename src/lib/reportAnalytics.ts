/**
 * Report Analytics Engine (Phase 8)
 * ==================================
 * Pure, framework-free analytics layer for the /reports workspace.
 *
 * Every value produced here is DERIVED from the centralized GIS registry
 * (GISContext data) — no duplicated state, no hardcoded statistics.
 * All functions are pure: they never mutate their inputs and can be used
 * from any component, context or test.
 *
 * IMPORTANT: analytics describe the prototype/demo registry. They are
 * system-generated operational insights, NOT legal or government decisions.
 */
import type {
  Building,
  DemoSpatialIdentifier,
  Floor,
  LandParcel,
  PropertyTypeGis,
  PropertyUnit,
  PropertyVerificationStatus,
} from '@/types/gis';
import type { ConflictSeverity, SpatialConflict } from '@/types/conflict';
import type { ActivityRecord, ActivityType } from '@/types/activity';
import type { VerificationMethod, VerificationRecord } from '@/types/verification';
import { computeDashboardStats, type DashboardStats } from '@/lib/gisSelectors';

// ── Presentation palette (Midnight Tech) ─────────────────────────────────────

export const VERIFICATION_STATUS_COLORS: Record<PropertyVerificationStatus, string> = {
  Verified: '#10B981',
  Pending: '#F59E0B',
  'Under Review': '#3B82F6',
  'Field Verification': '#8B5CF6',
  Rejected: '#EF4444',
  'Reinspection Required': '#F97316',
};

export const VERIFICATION_STATUS_ORDER: PropertyVerificationStatus[] = [
  'Verified',
  'Pending',
  'Under Review',
  'Field Verification',
  'Rejected',
  'Reinspection Required',
];

export const CONFLICT_SEVERITY_COLORS: Record<ConflictSeverity, string> = {
  Critical: '#DC2626',
  High: '#F97316',
  Medium: '#F59E0B',
  Low: '#64748B',
};

export const CONFLICT_SEVERITY_ORDER: ConflictSeverity[] = ['Critical', 'High', 'Medium', 'Low'];

export const ACTIVITY_TYPE_META: Record<ActivityType, { label: string; color: string }> = {
  PROPERTY_VERIFICATION: { label: 'Verifications', color: '#10B981' },
  CONFLICT_DETECTION: { label: 'Conflict Detections', color: '#DC2626' },
  CONFLICT_RESOLUTION: { label: 'Conflict Resolutions', color: '#059669' },
  CONFLICT_FIELD_REVIEW: { label: 'Field Reviews', color: '#F97316' },
  CONFLICT_CORRECTION: { label: 'Corrections', color: '#8B5CF6' },
  DATA_UPDATE: { label: 'Data Updates', color: '#0EA5E9' },
  BUILDING_UPDATE: { label: 'Building Updates', color: '#3B82F6' },
  AI_EXTRACTION: { label: 'AI Extractions', color: '#06B6D4' },
  '3D_RECONSTRUCTION': { label: '3D Reconstructions', color: '#6366F1' },
  WORKFLOW_TASK: { label: 'Workflow Tasks', color: '#14B8A6' },
};

// ── Filters ──────────────────────────────────────────────────────────────────

export interface ReportFilters {
  parcelId: string | null;
  buildingId: string | null;
  propertyType: PropertyTypeGis | null;
  verificationStatus: PropertyVerificationStatus | null;
  conflictSeverity: ConflictSeverity | null;
}

export const EMPTY_REPORT_FILTERS: ReportFilters = {
  parcelId: null,
  buildingId: null,
  propertyType: null,
  verificationStatus: null,
  conflictSeverity: null,
};

export function isFilterActive(f: ReportFilters): boolean {
  return Boolean(f.parcelId || f.buildingId || f.propertyType || f.verificationStatus || f.conflictSeverity);
}

/** Full centralized registry snapshot (as exposed by GISContext). */
export interface ReportRegistry {
  parcels: LandParcel[];
  buildings: Building[];
  floors: Floor[];
  properties: PropertyUnit[];
  verifications: VerificationRecord[];
  conflicts: SpatialConflict[];
  activities: ActivityRecord[];
  demoSpatialIds: DemoSpatialIdentifier[];
}

export interface ReportScope {
  parcels: LandParcel[];
  buildings: Building[];
  floors: Floor[];
  properties: PropertyUnit[];
  conflicts: SpatialConflict[];
  verifications: VerificationRecord[];
  activities: ActivityRecord[];
}

/**
 * Narrows the registry to the filtered scope. Parcel → building → floors
 * cascade first; property filters then narrow units; conflicts are scoped by
 * parcel/building/severity (falling back to affected units); verifications
 * and activities are scoped to the surviving entity ids.
 */
export function applyReportFilters(registry: ReportRegistry, filters: ReportFilters): ReportScope {
  const parcels = filters.parcelId
    ? registry.parcels.filter((p) => p.id === filters.parcelId)
    : registry.parcels;

  const parcelScopedBuildings = filters.parcelId
    ? registry.buildings.filter((b) => b.parcelId === filters.parcelId)
    : registry.buildings;
  const buildings = filters.buildingId
    ? parcelScopedBuildings.filter((b) => b.id === filters.buildingId)
    : parcelScopedBuildings;

  const buildingIds = new Set(buildings.map((b) => b.id));
  const parcelIds = new Set(parcels.map((p) => p.id));
  const floors = registry.floors.filter((f) => buildingIds.has(f.buildingId));

  let properties = registry.properties.filter((p) => buildingIds.has(p.buildingId));
  if (filters.verificationStatus) {
    properties = properties.filter((p) => p.verificationStatus === filters.verificationStatus);
  }
  if (filters.propertyType) {
    properties = properties.filter((p) => p.propertyType === filters.propertyType);
  }
  const propertyIds = new Set(properties.map((p) => p.id));

  const scopeFilters: ReportFilters = { ...filters, conflictSeverity: null };
  const conflicts = registry.conflicts.filter((c) => {
    if (filters.conflictSeverity && c.severity !== filters.conflictSeverity) return false;
    if (!isFilterActive(scopeFilters)) return true;
    if (c.affectedPropertyIds.some((id) => propertyIds.has(id))) return true;
    if (c.parcelId && parcelIds.has(c.parcelId)) return true;
    if (c.buildingId && buildingIds.has(c.buildingId)) return true;
    return false;
  });
  const conflictIds = new Set(conflicts.map((c) => c.id));

  const verifications = registry.verifications.filter((v) => propertyIds.has(v.propertyId));

  const activities = isFilterActive(filters)
    ? registry.activities.filter((a) => {
        if (a.entityType === 'PROPERTY') return propertyIds.has(a.entityId);
        if (a.entityType === 'BUILDING') return buildingIds.has(a.entityId);
        if (a.entityType === 'PARCEL') return parcelIds.has(a.entityId);
        if (a.entityType === 'CONFLICT') return conflictIds.has(a.entityId);
        if (a.entityType === 'VERIFICATION') {
          return registry.verifications.some((v) => v.id === a.entityId && propertyIds.has(v.propertyId));
        }
        return false;
      })
    : registry.activities;

  return { parcels, buildings, floors, properties, conflicts, verifications, activities };
}

// ── Derived analytics result model ───────────────────────────────────────────

export interface BuildingAnalytics {
  buildingId: string;
  buildingName: string;
  buildingCode: string;
  parcelId: string;
  floorsRegistered: number;
  floorsDeclared: number;
  units: number;
  verified: number;
  pending: number;
  inProgress: number;
  rejected: number;
  verificationRate: number;
  openConflicts: number;
}

export interface FloorAnalytics {
  floorId: string;
  floorName: string;
  buildingId: string;
  buildingName: string;
  units: number;
  verified: number;
}

export interface SeveritySlice {
  severity: ConflictSeverity;
  open: number;
  resolved: number;
  total: number;
}

export interface ActivityDaySlice {
  day: string; // e.g. "05 Mar"
  count: number;
}

export interface DecisionInsight {
  id: string;
  level: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  actionLabel: string;
  actionHref: string;
}

export interface ReportAnalytics extends DashboardStats {
  /** Scoped counts (post-filter) surfaced for section headers. */
  properties: number;
  verifications: number;
  activities: number;
  statusDistribution: Array<{ status: PropertyVerificationStatus; count: number }>;
  methodDistribution: Array<{ method: VerificationMethod; count: number }>;
  avgVerificationConfidence: number;
  buildingAnalytics: BuildingAnalytics[];
  floorAnalytics: FloorAnalytics[];
  floorsWithoutUnits: number;
  severitySlices: SeveritySlice[];
  conflictsByParcel: Array<{ id: string; label: string; open: number; resolved: number }>;
  conflictsByBuilding: Array<{ id: string; label: string; open: number; resolved: number }>;
  recentVerifications: VerificationRecord[];
  activityBreakdown: Array<{ type: ActivityType; count: number }>;
  activityByDay: ActivityDaySlice[];
  recentActivities: ActivityRecord[];
  coverage: {
    mappedParcels: number;
    totalParcels: number;
    mappedBuildings: number;
    totalBuildings: number;
    mappedFloors: number;
    totalFloors: number;
    mappedUnits: number;
    totalUnits: number;
    demoIdCoverage: number;
    unitsWithDemoId: number;
    unitsWithOfficialUlpin: number;
  };
  insights: DecisionInsight[];
}

const cap = <T,>(rows: T[], n: number): T[] => rows.slice(0, n);

function dedupeById<T>(rows: T[], key: (row: T) => string, seen: Set<string>): T[] {
  return rows.filter((row) => {
    const k = key(row);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/**
 * Derives the complete analytics model for the current scope.
 * Pure — recomputes from the given registry slice every time.
 */
export function computeReportAnalytics(scope: ReportScope, registry: ReportRegistry): ReportAnalytics {
  const { parcels, buildings, floors, properties, conflicts, verifications, activities } = scope;
  const base = computeDashboardStats(parcels, buildings, floors, properties, conflicts);

  // ── Verification distribution ──
  const statusDistribution = VERIFICATION_STATUS_ORDER.map((status) => ({
    status,
    count: properties.filter((p) => p.verificationStatus === status).length,
  }));

  const methodCounts = new Map<VerificationMethod, number>();
  let confidenceSum = 0;
  for (const v of verifications) {
    methodCounts.set(v.method, (methodCounts.get(v.method) ?? 0) + 1);
    confidenceSum += v.confidenceScore;
  }
  const methodDistribution = Array.from(methodCounts.entries())
    .map(([method, count]) => ({ method, count }))
    .sort((a, b) => b.count - a.count);

  // ── Building-wise analytics ──
  const buildingAnalytics: BuildingAnalytics[] = buildings
    .map((b) => {
      const units = properties.filter((p) => p.buildingId === b.id);
      const verified = units.filter((u) => u.verificationStatus === 'Verified').length;
      const pending = units.filter((u) => u.verificationStatus === 'Pending').length;
      const inProgress = units.filter(
        (u) =>
          u.verificationStatus === 'Under Review' ||
          u.verificationStatus === 'Field Verification' ||
          u.verificationStatus === 'Reinspection Required',
      ).length;
      const rejected = units.filter((u) => u.verificationStatus === 'Rejected').length;
      return {
        buildingId: b.id,
        buildingName: b.name,
        buildingCode: b.buildingCode,
        parcelId: b.parcelId,
        floorsRegistered: floors.filter((f) => f.buildingId === b.id).length,
        floorsDeclared: b.totalFloors,
        units: units.length,
        verified,
        pending,
        inProgress,
        rejected,
        verificationRate: units.length > 0 ? Math.round((verified / units.length) * 100) : 0,
        openConflicts: conflicts.filter((c) => c.buildingId === b.id && c.status !== 'Resolved').length,
      };
    })
    .sort((a, b) => b.units - a.units);

  // ── Floor-wise analytics ──
  const floorAnalytics: FloorAnalytics[] = floors
    .map((f) => {
      const units = properties.filter((p) => p.floorId === f.id);
      const building = buildings.find((b) => b.id === f.buildingId);
      return {
        floorId: f.id,
        floorName: f.name,
        buildingId: f.buildingId,
        buildingName: building?.name ?? f.buildingId,
        units: units.length,
        verified: units.filter((u) => u.verificationStatus === 'Verified').length,
      };
    })
    .sort((a, b) => b.units - a.units);
  const floorsWithoutUnits = floorAnalytics.filter((f) => f.units === 0).length;

  // ── Conflict slices ──
  const severitySlices: SeveritySlice[] = CONFLICT_SEVERITY_ORDER.map((severity) => {
    const rows = conflicts.filter((c) => c.severity === severity);
    return {
      severity,
      open: rows.filter((c) => c.status !== 'Resolved').length,
      resolved: rows.filter((c) => c.status === 'Resolved').length,
      total: rows.length,
    };
  });

  const conflictGroup = (
    keyOf: (c: SpatialConflict) => string | undefined,
    labelOf: (id: string) => string,
  ): Array<{ id: string; label: string; open: number; resolved: number }> => {
    const map = new Map<string, { open: number; resolved: number }>();
    for (const c of conflicts) {
      const key = keyOf(c);
      if (!key) continue;
      const entry = map.get(key) ?? { open: 0, resolved: 0 };
      if (c.status === 'Resolved') entry.resolved += 1;
      else entry.open += 1;
      map.set(key, entry);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, label: labelOf(id), ...v }))
      .sort((a, b) => b.open - b.resolved - (a.open - a.resolved) || b.open - a.open);
  };

  const conflictsByParcel = conflictGroup(
    (c) => c.parcelId,
    (id) => parcels.find((p) => p.id === id)?.parcelNumber ?? id,
  );
  const conflictsByBuilding = conflictGroup(
    (c) => c.buildingId,
    (id) => buildings.find((b) => b.id === id)?.name ?? id,
  );

  // ── Activity analytics ──
  const activityTypeCounts = new Map<ActivityType, number>();
  for (const a of activities) activityTypeCounts.set(a.type, (activityTypeCounts.get(a.type) ?? 0) + 1);
  const activityBreakdown = Array.from(activityTypeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const dayCounts = new Map<string, number>();
  for (const a of activities) {
    const day = dayLabel(a.timestamp);
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }
  const activityByDay: ActivityDaySlice[] = Array.from(dayCounts.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(-7)
    .map(([day, count]) => ({ day, count }));

  const recentVerifications = [...verifications]
    .sort((a, b) => b.verificationDate.localeCompare(a.verificationDate))
    .slice(0, 6);
  const recentActivities = [...activities]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 8);

  // ── Spatial mapping coverage ──
  const hasPolygon = (g: { type: string } | undefined): boolean =>
    g?.type === 'Polygon' || g?.type === 'MultiPolygon';
  const unitsWithDemoId = properties.filter((p) => registry.demoSpatialIds.some((d) => d.propertyUnitId === p.id)).length;
  const unitsWithOfficialUlpin = properties.filter((p) => p.officialUlpinReference !== null).length;
  const coverage: ReportAnalytics['coverage'] = {
    mappedParcels: parcels.filter((p) => hasPolygon(p.geometry)).length,
    totalParcels: parcels.length,
    mappedBuildings: buildings.filter((b) => hasPolygon(b.geometry)).length,
    totalBuildings: buildings.length,
    mappedFloors: floors.length,
    totalFloors: floors.length,
    mappedUnits: properties.filter((p) => hasPolygon(p.geometry)).length,
    totalUnits: properties.length,
    demoIdCoverage: properties.length > 0 ? Math.round((unitsWithDemoId / properties.length) * 100) : 0,
    unitsWithDemoId,
    unitsWithOfficialUlpin,
  };

  // ── Decision support insights (system-generated, prototype) ──
  const insights: DecisionInsight[] = [];
  const seenBuildings = new Set<string>();

  for (const c of cap(
    conflicts.filter((x) => x.severity === 'Critical' && x.status !== 'Resolved'),
    3,
  )) {
    insights.push({
      id: `critical-conflict-${c.id}`,
      level: 'critical',
      title: `Critical conflict unresolved — ${c.conflictNumber}`,
      detail: `${c.type} affecting ${c.affectedPropertyIds.length} unit(s). Operational priority for investigation.`,
      actionLabel: 'View Conflict',
      actionHref: `/conflicts?conflict=${c.id}`,
    });
  }

  const attentionBuildings = dedupeById(
    [...buildingAnalytics].filter((b) => b.units > 0 && b.verificationRate < 50).sort((a, b) => a.verificationRate - b.verificationRate),
    (b) => b.buildingId,
    seenBuildings,
  );
  for (const b of cap(attentionBuildings, 3)) {
    insights.push({
      id: `low-verification-${b.buildingId}`,
      level: 'warning',
      title: `Low verification rate — ${b.buildingName}`,
      detail: `Only ${b.verified} of ${b.units} units verified (${b.verificationRate}%). ${b.pending} pending, ${b.inProgress} in progress.`,
      actionLabel: 'View Building',
      actionHref: `/buildings/${b.buildingId}`,
    });
  }

  const pendingHeavy = dedupeById(
    [...buildingAnalytics].filter((b) => b.pending >= 2).sort((a, b) => b.pending - a.pending),
    (b) => b.buildingId,
    seenBuildings,
  );
  for (const b of cap(pendingHeavy, 3)) {
    insights.push({
      id: `pending-heavy-${b.buildingId}`,
      level: 'warning',
      title: `High pending count — ${b.buildingName}`,
      detail: `${b.pending} unit(s) still awaiting verification scheduling.`,
      actionLabel: 'View Building',
      actionHref: `/buildings/${b.buildingId}`,
    });
  }

  for (const u of cap(
    properties.filter((p) => p.verificationStatus === 'Rejected' || p.verificationStatus === 'Reinspection Required'),
    3,
  )) {
    insights.push({
      id: `attention-unit-${u.id}`,
      level: 'warning',
      title: `${u.id} requires attention`,
      detail: `Status: ${u.verificationStatus}. Review the verification timeline and schedule the next field action.`,
      actionLabel: 'Open Verification',
      actionHref: `/verification?property=${u.id}`,
    });
  }

  const mappingGaps = dedupeById(
    buildingAnalytics.filter((b) => b.floorsRegistered !== b.floorsDeclared || b.units === 0),
    (b) => b.buildingId,
    seenBuildings,
  );
  for (const b of cap(mappingGaps, 3)) {
    insights.push({
      id: `mapping-gap-${b.buildingId}`,
      level: 'info',
      title: `Incomplete vertical mapping — ${b.buildingName}`,
      detail: `${b.floorsRegistered} of ${b.floorsDeclared} declared floors carry registry units; ${b.units} unit(s) mapped so far.`,
      actionLabel: 'View in 3D',
      actionHref: `/map?building=${b.buildingId}&mode=3d`,
    });
  }

  if (properties.length > 0 && coverage.demoIdCoverage < 100) {
    insights.push({
      id: 'demo-id-coverage',
      level: 'info',
      title: 'Demo Spatial Identifier coverage incomplete',
      detail: `${unitsWithDemoId} of ${properties.length} units carry a demo spatial identifier in the current scope.`,
      actionLabel: 'Open AI Extraction',
      actionHref: '/ai-extraction',
    });
  }

  return {
    ...base,
    properties: properties.length,
    verifications: verifications.length,
    activities: activities.length,
    statusDistribution,
    methodDistribution,
    avgVerificationConfidence: verifications.length > 0 ? Math.round(confidenceSum / verifications.length) : 0,
    buildingAnalytics,
    floorAnalytics,
    floorsWithoutUnits,
    severitySlices,
    conflictsByParcel,
    conflictsByBuilding,
    recentVerifications,
    activityBreakdown,
    activityByDay,
    recentActivities,
    coverage,
    insights,
  };
}

/** Property-type options present in the given unit set (dynamic, no hardcoding). */
export function selectPropertyTypes(properties: PropertyUnit[]): PropertyTypeGis[] {
  return Array.from(new Set(properties.map((p) => p.propertyType))).sort();
}