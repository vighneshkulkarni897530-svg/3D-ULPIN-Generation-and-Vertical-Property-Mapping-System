import { NextResponse } from 'next/server';
import { MOCK_PARCELS } from '@/data/parcels';
import { MOCK_BUILDINGS } from '@/data/buildings';
import { MOCK_FLOORS } from '@/data/floors';
import { MOCK_PROPERTIES } from '@/data/properties';
import { MOCK_VERIFICATIONS } from '@/data/verifications';
import { MOCK_CONFLICTS } from '@/data/conflicts';
import { MOCK_ACTIVITIES } from '@/data/activities';
import { MOCK_DEMO_SPATIAL_IDS } from '@/data/demoSpatialIds';
import { computeDashboardStats } from '@/lib/gisSelectors';
import {
  buildDemoSpatialId,
  getPropertyLineage,
  groupFloorsByBuilding,
  isDemoSpatialId,
  formatRelativeTime,
} from '@/lib/gisUtils';
import {
  twinBuildingToGis,
  twinFloorsToGis,
  twinUnitsToGis,
  gisToTwinBuildingInfo,
  gisStatusToTwin,
  twinStatusToGis,
} from '@/lib/gisAdapters';
import { TWIN_BUILDING, TWIN_FLOORS } from '@/data/mockDigitalTwin';

export async function GET() {
  const stats = computeDashboardStats(
    MOCK_PARCELS,
    MOCK_BUILDINGS,
    MOCK_FLOORS,
    MOCK_PROPERTIES,
    MOCK_CONFLICTS,
  );

  // Hierarchy integrity checks
  const buildingIds = new Set(MOCK_BUILDINGS.map((b) => b.id));
  const floorIds = new Set(MOCK_FLOORS.map((f) => f.id));
  const parcelIds = new Set(MOCK_PARCELS.map((p) => p.id));
  const orphanProps = MOCK_PROPERTIES.filter(
    (p) => !buildingIds.has(p.buildingId) || !floorIds.has(p.floorId) || !parcelIds.has(p.parcelId),
  ).map((p) => p.id);
  const floorsWithUnknownBuilding = MOCK_FLOORS.filter((f) => !buildingIds.has(f.buildingId)).map((f) => f.id);
  const buildingsWithUnknownParcel = MOCK_BUILDINGS.filter((b) => !parcelIds.has(b.parcelId)).map((b) => b.id);

  // Demo spatial ID guarantees
  const allDemoIdsNonOfficial = MOCK_PROPERTIES.every((p) => p.demoSpatialIdMetadata.isOfficialUlpin === false);
  const allUlpinRefsNull = MOCK_PROPERTIES.every((p) => p.officialUlpinReference === null);
  const allDemoIdPrefix = MOCK_PROPERTIES.every((p) => isDemoSpatialId(p.demoSpatialId));
  const demoIdRecordsMatch = MOCK_DEMO_SPATIAL_IDS.every(
    (d) => MOCK_PROPERTIES.find((p) => p.id === d.propertyUnitId)?.demoSpatialId === d.demoId,
  );

  // Utils checks
  const parcel1 = MOCK_PARCELS[0];
  const sampleBuiltId = buildDemoSpatialId(parcel1, 3, '0301');
  const lineage = getPropertyLineage(MOCK_PROPERTIES[0], MOCK_PARCELS, MOCK_BUILDINGS, MOCK_FLOORS);
  const groupedFloors = Object.keys(groupFloorsByBuilding(MOCK_FLOORS)).length;
  const relTime = formatRelativeTime(new Date(Date.now() - 5 * 60000).toISOString());

  // Adapter round-trip checks
  const { parcel: twinParcel, building: twinBuilding } = twinBuildingToGis();
  const twinGisFloors = twinFloorsToGis(TWIN_FLOORS, twinBuilding.id);
  const twinGisUnits = twinUnitsToGis(TWIN_FLOORS, { parcelId: twinParcel.id, buildingId: twinBuilding.id });
  const roundTripInfo = gisToTwinBuildingInfo(twinBuilding, twinGisUnits);
  const statusRoundTrip = twinStatusToGis(gisStatusToTwin('Verified')) === 'Verified'
    && twinStatusToGis(gisStatusToTwin('Pending')) === 'Pending'
    && twinStatusToGis(gisStatusToTwin('Under Review')) === 'Under Review'
    && twinStatusToGis(gisStatusToTwin('Reinspection Required')) === 'Reinspection Required'
    && gisStatusToTwin(twinStatusToGis('UNDER_REVIEW')) === 'UNDER_REVIEW'
    && gisStatusToTwin(twinStatusToGis('DISPUTED')) === 'DISPUTED'
    && gisStatusToTwin(twinStatusToGis('VERIFIED')) === 'VERIFIED'
    && gisStatusToTwin(twinStatusToGis('PENDING')) === 'PENDING';

  return NextResponse.json({
    stats,
    counts: {
      parcels: MOCK_PARCELS.length,
      buildings: MOCK_BUILDINGS.length,
      floors: MOCK_FLOORS.length,
      properties: MOCK_PROPERTIES.length,
      verifications: MOCK_VERIFICATIONS.length,
      conflicts: MOCK_CONFLICTS.length,
      activities: MOCK_ACTIVITIES.length,
      demoSpatialIds: MOCK_DEMO_SPATIAL_IDS.length,
    },
    integrity: {
      orphanProps,
      floorsWithUnknownBuilding,
      buildingsWithUnknownParcel,
      allDemoIdsNonOfficial,
      allUlpinRefsNull,
      allDemoIdPrefix,
      demoIdRecordsMatch,
      statusRoundTrip,
    },
    utils: { sampleBuiltId, lineageOk: Boolean(lineage.parcel && lineage.building && lineage.floor), groupedFloors, relTime },
    adapters: {
      twinParcelId: twinParcel.id,
      twinBuildingId: twinBuilding.id,
      twinGisFloorCount: twinGisFloors.length,
      twinGisUnitCount: twinGisUnits.length,
      roundTripNameMatches: roundTripInfo.name === TWIN_BUILDING.name,
      roundTripUnitCountMatches: roundTripInfo.totalUnits === TWIN_BUILDING.totalUnits,
    },
  });
}