/**
 * GIS Data Adapters
 * =================
 * Adapters that bridge the existing Digital Twin mock data
 * (`@/data/mockDigitalTwin`) with the new unified GIS data model
 * (`@/types/gis`).
 *
 * The Digital Twin page predates the unified GIS architecture and keeps its
 * own self-contained dataset (TWIN_BUILDING / TWIN_FLOORS). These adapters
 * convert in both directions so the twin can gradually be driven by the
 * unified model without breaking existing pages.
 */
import type {
  Building,
  Floor,
  LandParcel,
  PropertyUnit,
  PropertyVerificationStatus,
  ParcelStatus,
  BuildingStatus,
  PropertyTypeGis,
  DataSource,
  Geometry,
} from '@/types/gis';
import {
  TWIN_BUILDING,
  type TwinBuildingInfo,
  type TwinFloor,
  type TwinUnit,
  type TwinVerificationStatus,
} from '@/data/mockDigitalTwin';

// ── Status mappings ─────────────────────────────────────────────────────────

/** Maps Digital Twin verification status → unified GIS property status. */
export const twinStatusToGis = (status: TwinVerificationStatus): PropertyVerificationStatus => {
  switch (status) {
    case 'VERIFIED':
      return 'Verified';
    case 'PENDING':
      return 'Pending';
    case 'UNDER_REVIEW':
      return 'Under Review';
    case 'DISPUTED':
      return 'Reinspection Required';
    default: {
      const exhaustive: never = status;
      void exhaustive;
      return 'Pending';
    }
  }
};

/** Maps unified GIS property status → Digital Twin verification status. */
export const gisStatusToTwin = (status: PropertyVerificationStatus): TwinVerificationStatus => {
  switch (status) {
    case 'Verified':
      return 'VERIFIED';
    case 'Pending':
      return 'PENDING';
    case 'Under Review':
    case 'Field Verification':
      return 'UNDER_REVIEW';
    case 'Rejected':
    case 'Reinspection Required':
      return 'DISPUTED';
    default: {
      const exhaustive: never = status;
      void exhaustive;
      return 'PENDING';
    }
  }
};

// ── Twin → GIS conversions ──────────────────────────────────────────────────

const rectCoords = (swLat: number, swLng: number, neLat: number, neLng: number): Geometry => ({
  type: 'Polygon',
  coordinates: [[swLng, swLat], [neLng, swLat], [neLng, neLat], [swLng, neLat], [swLng, swLat]],
});

/**
 * Converts the Digital Twin building info into a unified GIS `Building`
 * plus its parent `LandParcel` record.
 */
export const twinBuildingToGis = (twin: TwinBuildingInfo = TWIN_BUILDING): {
  parcel: LandParcel;
  building: Building;
} => {
  const lat = twin.latitude;
  const lng = twin.longitude;
  const parcel: LandParcel = {
    id: 'PARCEL-TWIN-GREEN-VALLEY',
    parcelNumber: `TWIN-${twin.propertyId}`,
    location: twin.cityState,
    district: 'Pune',
    state: 'Maharashtra',
    area: Math.round(twin.builtUpAreaSqFt * 0.092903), // sq ft → m²
    geometry: rectCoords(lat - 0.0008, lng - 0.0008, lat + 0.0008, lng + 0.0008),
    centroid: { lat, lng },
    latitude: lat,
    longitude: lng,
    status: 'ACTIVE' as ParcelStatus,
    createdAt: new Date(`${twin.constructionYear}-01-01`).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const building: Building = {
    id: 'B-TWIN-GREEN-VALLEY',
    buildingCode: `BLDG-TWIN-${twin.propertyId}`,
    name: twin.name,
    parcelId: parcel.id,
    address: twin.cityState,
    latitude: lat,
    longitude: lng,
    height: twin.heightM,
    totalFloors: twin.totalFloors,
    builtUpArea: twin.builtUpAreaSqFt,
    yearBuilt: twin.constructionYear,
    geometry: rectCoords(lat - 0.0004, lng - 0.0004, lat + 0.0004, lng + 0.0004),
    status: 'ACTIVE' as BuildingStatus,
  };
  return { parcel, building };
};

/** Converts one Digital Twin floor into a unified GIS `Floor`. */
export const twinFloorToGis = (twin: TwinFloor, buildingId: string): Floor => ({
  id: `F-TWIN-${buildingId}-${twin.level}`,
  buildingId,
  floorNumber: twin.level,
  name: twin.label,
  elevation: twin.elevationM,
  area: twin.areaSqFt,
  totalUnits: twin.units.length,
});

/** Converts all Digital Twin floors into unified GIS `Floor[]`. */
export const twinFloorsToGis = (twins: TwinFloor[], buildingId: string): Floor[] =>
  twins.map((f) => twinFloorToGis(f, buildingId));

/** Maps a Digital Twin unit type to the unified GIS property type. */
const twinUnitTypeToGis = (type: TwinUnit['type']): PropertyTypeGis =>
  type === 'RETAIL' ? 'COMMERCIAL' : 'RESIDENTIAL';

/** Converts one Digital Twin unit into a unified GIS `PropertyUnit`. */
export const twinUnitToGis = (
  twin: TwinUnit,
  refs: { parcelId: string; buildingId: string; floorId: string },
): PropertyUnit => {
  const now = new Date().toISOString();
  return {
    id: `PROP-TWIN-${twin.id.replace(/^u-/, '')}`,
    propertyId: `TWIN-${twin.taxAssessment}`,
    demoSpatialId: `3D-MH-PUN-GV-${twin.number}`,
    officialUlpinReference: null,
    buildingId: refs.buildingId,
    floorId: refs.floorId,
    parcelId: refs.parcelId,
    unitNumber: twin.number,
    propertyType: twinUnitTypeToGis(twin.type),
    area: twin.areaSqFt,
    latitude: TWIN_BUILDING.latitude,
    longitude: TWIN_BUILDING.longitude,
    elevation: twin.floorLevel * 3.2,
    geometry: {
      type: 'Point',
      coordinates: [TWIN_BUILDING.longitude, TWIN_BUILDING.latitude],
    },
    ownerReferenceName: twin.ownerName,
    verificationStatus: twinStatusToGis(twin.status),
    lastUpdated: now,
    dataSource: 'SURVEY_RECORD' as DataSource,
    demoSpatialIdMetadata: {
      label: 'Demo Spatial Identifier',
      isOfficialUlpin: false,
      generatedAt: now,
      algorithmVersion: '3D-ULPIN/v2.4-spatial-hash',
      confidence: Math.min(0.99, twin.healthScore / 100),
      note: 'Demo spatial ID generated from Digital Twin dataset. NOT a legally-valid ULPIN.',
    },
    officialUlpinMetadata: {
      isIntegrated: false,
      integrationStatus: 'FUTURE',
      note: 'Official ULPIN integration pending government API onboarding.',
    },
  };
};

/** Converts every unit in a Digital Twin floor list to GIS `PropertyUnit[]`. */
export const twinUnitsToGis = (
  twinFloors: TwinFloor[],
  refs: { parcelId: string; buildingId: string },
): PropertyUnit[] =>
  twinFloors.flatMap((floor) =>
    floor.units.map((unit) =>
      twinUnitToGis(unit, {
        parcelId: refs.parcelId,
        buildingId: refs.buildingId,
        floorId: `F-TWIN-${refs.buildingId}-${floor.level}`,
      }),
    ),
  );

// ── GIS → Twin conversion ───────────────────────────────────────────────────

/**
 * Projects a unified GIS building + properties back into the Digital Twin
 * view model so twin pages can be driven by GIS data.
 */
export const gisToTwinBuildingInfo = (
  building: Building,
  properties: PropertyUnit[],
  verifiedScore = 92,
): TwinBuildingInfo => {
  const occupied = properties.filter((p) => p.verificationStatus === 'Verified').length;
  const disputed = properties.filter(
    (p) =>
      p.verificationStatus === 'Rejected' || p.verificationStatus === 'Reinspection Required',
  ).length;
  return {
    name: building.name,
    propertyId: building.buildingCode,
    ulpin: 'ULPIN-PENDING-GOVT-API',
    location: building.address,
    cityState: building.address,
    type: 'Residential Apartment',
    totalFloors: building.totalFloors,
    totalUnits: properties.length,
    builtUpAreaSqFt: building.builtUpArea,
    constructionYear: building.yearBuilt,
    heightM: building.height,
    occupiedUnits: occupied,
    vacantUnits: Math.max(0, properties.length - occupied - disputed),
    leasedUnits: 0,
    propertyHealth: verifiedScore,
    verificationScore: verifiedScore,
    verificationStatus: 'VERIFIED',
    systemStatus: 'ACTIVE',
    latitude: building.latitude,
    longitude: building.longitude,
  };
};