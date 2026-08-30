/**
 * GIS Selectors
 * =============
 * Pure, reusable selector functions for deriving dashboard statistics and
 * filtered views from the unified GIS data model.
 *
 * All selectors are pure functions — they never mutate state and can be
 * used anywhere (components, context, tests) without side effects.
 */
import type {
  LandParcel,
  Building,
  Floor,
  PropertyUnit,
  ParcelStatus,
  BuildingStatus,
  PropertyVerificationStatus,
} from '@/types/gis';
import type { SpatialConflict, ConflictType, ConflictStatus, ConflictSeverity } from '@/types/conflict';

// ── Parcel selectors ────────────────────────────────────────────────────────

export const selectAllParcels = (parcels: LandParcel[]): LandParcel[] => parcels;

export const selectParcelsByStatus = (parcels: LandParcel[], status: ParcelStatus): LandParcel[] =>
  parcels.filter((p) => p.status === status);

export const selectParcelById = (parcels: LandParcel[], id: string): LandParcel | undefined =>
  parcels.find((p) => p.id === id);

// ── Building selectors ──────────────────────────────────────────────────────

export const selectBuildingsByParcel = (buildings: Building[], parcelId: string): Building[] =>
  buildings.filter((b) => b.parcelId === parcelId);

export const selectBuildingsByStatus = (buildings: Building[], status: BuildingStatus): Building[] =>
  buildings.filter((b) => b.status === status);

export const selectBuildingById = (buildings: Building[], id: string): Building | undefined =>
  buildings.find((b) => b.id === id);

// ── Floor selectors ─────────────────────────────────────────────────────────

export const selectFloorsByBuilding = (floors: Floor[], buildingId: string): Floor[] =>
  floors
    .filter((f) => f.buildingId === buildingId)
    .sort((a, b) => a.floorNumber - b.floorNumber);

export const selectFloorById = (floors: Floor[], id: string): Floor | undefined =>
  floors.find((f) => f.id === id);

// ── Property selectors ──────────────────────────────────────────────────────

export const selectPropertiesByParcel = (properties: PropertyUnit[], parcelId: string): PropertyUnit[] =>
  properties.filter((p) => p.parcelId === parcelId);

export const selectPropertiesByBuilding = (properties: PropertyUnit[], buildingId: string): PropertyUnit[] =>
  properties.filter((p) => p.buildingId === buildingId);

export const selectPropertiesByFloor = (properties: PropertyUnit[], floorId: string): PropertyUnit[] =>
  properties.filter((p) => p.floorId === floorId);

export const selectPropertiesByStatus = (
  properties: PropertyUnit[],
  status: PropertyVerificationStatus,
): PropertyUnit[] => properties.filter((p) => p.verificationStatus === status);

export const selectPropertyById = (properties: PropertyUnit[], id: string): PropertyUnit | undefined =>
  properties.find((p) => p.id === id);

// ── Conflict selectors ──────────────────────────────────────────────────────

export const selectConflictById = (conflicts: SpatialConflict[], id: string): SpatialConflict | undefined =>
  conflicts.find((c) => c.id === id);

export const selectConflictsByType = (conflicts: SpatialConflict[], type: ConflictType): SpatialConflict[] =>
  conflicts.filter((c) => c.type === type);

export const selectActiveConflicts = (conflicts: SpatialConflict[]): SpatialConflict[] =>
  conflicts.filter((c) => c.status !== 'Resolved');



export const selectConflictsByStatus = (conflicts: SpatialConflict[], status: ConflictStatus): SpatialConflict[] =>
  conflicts.filter((c) => c.status === status);

export const selectConflictsBySeverity = (
  conflicts: SpatialConflict[],
  severity: ConflictSeverity,
): SpatialConflict[] => conflicts.filter((c) => c.severity === severity);

export const selectOpenConflicts = (conflicts: SpatialConflict[]): SpatialConflict[] =>
  conflicts.filter((c) => c.status !== 'Resolved');

export const selectConflictsByParcel = (conflicts: SpatialConflict[], parcelId: string): SpatialConflict[] =>
  conflicts.filter((c) => c.parcelId === parcelId);

// ── Dashboard statistics ────────────────────────────────────────────────────

export interface DashboardStats {
  totalParcels: number;
  activeParcels: number;
  disputedParcels: number;
  totalBuildings: number;
  activeBuildings: number;
  totalFloors: number;
  totalVerticalProperties: number;
  verifiedProperties: number;
  pendingProperties: number;
  underReviewProperties: number;
  fieldVerificationProperties: number;
  rejectedProperties: number;
  reinspectionRequiredProperties: number;
  totalConflicts: number;
  openConflicts: number;
  criticalConflicts: number;
  resolvedConflicts: number;
  verificationRate: number;
}

export const computeDashboardStats = (
  parcels: LandParcel[],
  buildings: Building[],
  floors: Floor[],
  properties: PropertyUnit[],
  conflicts: SpatialConflict[],
): DashboardStats => {
  const verified = selectPropertiesByStatus(properties, 'Verified').length;
  const total = properties.length;
  return {
    totalParcels: parcels.length,
    activeParcels: parcels.filter((p) => p.status === 'ACTIVE').length,
    disputedParcels: parcels.filter((p) => p.status === 'DISPUTED').length,
    totalBuildings: buildings.length,
    activeBuildings: buildings.filter((b) => b.status === 'ACTIVE').length,
    totalFloors: floors.length,
    totalVerticalProperties: total,
    verifiedProperties: verified,
    pendingProperties: selectPropertiesByStatus(properties, 'Pending').length,
    underReviewProperties: selectPropertiesByStatus(properties, 'Under Review').length,
    fieldVerificationProperties: selectPropertiesByStatus(properties, 'Field Verification').length,
    rejectedProperties: selectPropertiesByStatus(properties, 'Rejected').length,
    reinspectionRequiredProperties: selectPropertiesByStatus(properties, 'Reinspection Required').length,
    totalConflicts: conflicts.length,
    openConflicts: selectOpenConflicts(conflicts).length,
    criticalConflicts: conflicts.filter((c) => c.severity === 'Critical').length,
    resolvedConflicts: selectConflictsByStatus(conflicts, 'Resolved').length,
    verificationRate: total > 0 ? Math.round((verified / total) * 100) : 0,
  };
};