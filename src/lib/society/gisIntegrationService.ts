/**
 * Society Hierarchy → GIS Entity Integration Service
 * ==================================================
 * Adapters and data loaders that transform real Firestore Society records
 * (Societies, Buildings, Floors, Flats, and Phase 4 Verifications) into
 * unified GIS Data Model entities (LandParcel, Building, Floor, PropertyUnit).
 *
 * This enables real registered societies to be rendered on the 2D GIS Leaflet
 * map, explored in 3D, searched by 14-digit ULPIN, and inspected with official
 * government verification decisions.
 */

import type {
  Building as GisBuilding,
  Floor as GisFloor,
  LandParcel,
  PropertyUnit,
  PropertyVerificationStatus,
  ParcelStatus,
  BuildingStatus as GisBuildingStatus,
  PropertyTypeGis,
  DataSource,
  Geometry,
  DemoSpatialIdentifier,
} from '@/types/gis';
import type {
  Society,
  Building as SocietyBuilding,
  Floor as SocietyFloor,
  Flat as SocietyFlat,
  GovVerification,
  GovVerificationStatus,
} from '@/types/society';
import {
  generateSocietyUlpin,
  generate3dVerticalUlpin,
  generateBuildingSpatialId,
  createDemoSpatialMetadata,
  createOfficialUlpinMetadata,
} from './ulpinGenerator';
import { getAvailableSocieties } from './service';
import { getBuildings } from './buildingService';
import { getFloors } from './floorService';
import { getFlats } from './flatService';
import { getAllVerifications } from './governmentService';

// ── Geographic Footprint Helpers ─────────────────────────────────────────────

/** Generates a rectangular polygon around a central coordinate. */
function createRectPolygon(
  centerLat: number,
  centerLng: number,
  halfSpanLat: number,
  halfSpanLng: number,
): Geometry {
  const swLat = centerLat - halfSpanLat;
  const swLng = centerLng - halfSpanLng;
  const neLat = centerLat + halfSpanLat;
  const neLng = centerLng + halfSpanLng;

  return {
    type: 'Polygon',
    coordinates: [
      [
        [swLng, swLat],
        [neLng, swLat],
        [neLng, neLat],
        [swLng, neLat],
        [swLng, swLat],
      ],
    ],
  };
}

/**
 * Maps a Phase 4 government verification status into a unified GIS property verification status.
 */
export function mapGovStatusToGisStatus(
  status?: GovVerificationStatus | null,
): PropertyVerificationStatus {
  switch (status) {
    case 'verified':
      return 'Verified';
    case 'pending':
      return 'Pending';
    case 'needs-review':
      return 'Under Review';
    case 'rejected':
      return 'Rejected';
    case 'flagged':
      return 'Reinspection Required';
    default:
      return 'Pending';
  }
}

/**
 * Converts a Firestore Society document into a GIS `LandParcel`.
 */
export function societyToLandParcel(society: Society, baseUlpin?: string): LandParcel {
  const ulpin = baseUlpin || generateSocietyUlpin(society);
  const lat = society.location?.latitude ?? 18.5204;
  const lng = society.location?.longitude ?? 73.8567;

  // Generate an approximate parcel bounding polygon (± 0.0008 deg ≈ 85m radius)
  const geometry = createRectPolygon(lat, lng, 0.0008, 0.0008);

  const parcelStatus: ParcelStatus =
    society.status === 'active' ? 'ACTIVE' : 'INACTIVE';

  return {
    id: society.id,
    parcelNumber: ulpin,
    location: `${society.address.line1}, ${society.address.city}`,
    district: society.address.district || society.address.city || 'Pune',
    state: society.address.state || 'Maharashtra',
    area: 4500, // Estimated land parcel area in m²
    geometry,
    centroid: { lat, lng },
    latitude: lat,
    longitude: lng,
    status: parcelStatus,
    createdAt: society.createdAt ? society.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: society.updatedAt ? society.updatedAt.toISOString() : new Date().toISOString(),
  };
}

/**
 * Converts a Firestore Building into a unified GIS `Building`.
 */
export function buildingToGisBuilding(
  bldg: SocietyBuilding,
  parcelId: string,
  societyLat: number,
  societyLng: number,
  index = 0,
): GisBuilding {
  // Offset building footprint slightly from parcel centroid if multiple buildings exist
  const offsetLat = (index % 3 - 1) * 0.0003;
  const offsetLng = Math.floor(index / 3) * 0.0003;

  const lat = bldg.location?.latitude ?? societyLat + offsetLat;
  const lng = bldg.location?.longitude ?? societyLng + offsetLng;

  const geometry = createRectPolygon(lat, lng, 0.00025, 0.00025);

  const bldgStatus: GisBuildingStatus =
    bldg.status === 'active' ? 'ACTIVE' : 'INACTIVE';

  return {
    id: bldg.id,
    buildingCode: bldg.code,
    name: bldg.name,
    parcelId,
    address: `${bldg.name}, ${parcelId}`,
    latitude: lat,
    longitude: lng,
    height: Math.max(12, bldg.floorCount * 3.2), // ~3.2m per floor
    totalFloors: bldg.floorCount,
    builtUpArea: bldg.plannedFlatCount * 950, // estimated sqft
    yearBuilt: 2022,
    geometry,
    status: bldgStatus,
  };
}

/**
 * Converts a Firestore Floor into a unified GIS `Floor`.
 */
export function floorToGisFloor(floor: SocietyFloor, buildingId: string): GisFloor {
  const elevation =
    floor.floorNumber >= 0 ? floor.floorNumber * 3.2 : floor.floorNumber * 3.0;

  return {
    id: floor.id,
    buildingId,
    floorNumber: floor.floorNumber,
    name: floor.floorLabel,
    elevation,
    area: Math.max(1200, floor.plannedFlatCount * 900),
    totalUnits: floor.plannedFlatCount,
  };
}

/**
 * Converts a Firestore Flat into a unified GIS `PropertyUnit`.
 */
export function flatToPropertyUnit(
  flat: SocietyFlat,
  bldg: SocietyBuilding,
  floor: SocietyFloor,
  society: Society,
  baseUlpin: string,
  govVerification?: GovVerification | null,
): PropertyUnit {
  const verticalUlpin = generate3dVerticalUlpin(baseUlpin, floor.floorNumber, flat.flatNumber);
  const now = new Date().toISOString();

  const gisPropertyType: PropertyTypeGis =
    bldg.type === 'Commercial'
      ? 'COMMERCIAL'
      : bldg.type === 'Mixed Use'
      ? 'MIXED_USE'
      : 'RESIDENTIAL';

  const verificationStatus = mapGovStatusToGisStatus(govVerification?.status);

  const lat = bldg.location?.latitude ?? society.location?.latitude ?? 18.5204;
  const lng = bldg.location?.longitude ?? society.location?.longitude ?? 73.8567;
  const elevation = (floor.floorNumber >= 0 ? floor.floorNumber : 0) * 3.2;

  const areaSqFt = flat.area || 850;

  return {
    id: flat.id,
    propertyId: `FLAT-${flat.flatNumber}-${bldg.code}`,
    demoSpatialId: verticalUlpin,
    officialUlpinReference: null,
    buildingId: bldg.id,
    floorId: floor.id,
    parcelId: society.id,
    unitNumber: flat.flatNumber,
    propertyType: gisPropertyType,
    area: areaSqFt,
    latitude: lat,
    longitude: lng,
    elevation,
    geometry: {
      type: 'Point',
      coordinates: [lng, lat],
    },
    ownerReferenceName: `Flat ${flat.flatNumber} Occupant`,
    verificationStatus,
    lastUpdated: flat.updatedAt ? flat.updatedAt.toISOString() : now,
    dataSource: 'SURVEY_RECORD' as DataSource,
    demoSpatialIdMetadata: createDemoSpatialMetadata(
      `3D Vertical Spatial Identifier generated for Flat ${flat.flatNumber} in ${bldg.name}, ${society.name}.`,
    ),
    officialUlpinMetadata: createOfficialUlpinMetadata(),
  };
}

/**
 * Creates a DemoSpatialIdentifier record matching the PropertyUnit.
 */
export function createDemoSpatialIdRecord(
  propertyUnit: PropertyUnit,
  algorithm = 'Bhu-Aadhaar-14Digit-3DVertical/v1.0',
): DemoSpatialIdentifier {
  return {
    id: `DSID-${propertyUnit.id}`,
    propertyUnitId: propertyUnit.id,
    demoId: propertyUnit.demoSpatialId,
    algorithm,
    confidence: 0.98,
    isOfficial: false,
    generatedAt: propertyUnit.lastUpdated,
    note: propertyUnit.demoSpatialIdMetadata.note,
  };
}

// ── Full Firestore Hierarchy GIS Loader ──────────────────────────────────────

export interface RealSocietiesGisDataset {
  parcels: LandParcel[];
  buildings: GisBuilding[];
  floors: GisFloor[];
  properties: PropertyUnit[];
  demoSpatialIds: DemoSpatialIdentifier[];
}

/**
 * Fetches all real societies, buildings, floors, and flats from Firestore, joins them
 * with Phase 4 Government Verifications, and transforms them into GIS entities.
 */
export async function fetchAllRealSocietiesGisData(): Promise<RealSocietiesGisDataset> {
  const [societies, allVerifications] = await Promise.all([
    getAvailableSocieties(),
    getAllVerifications().catch(() => [] as GovVerification[]),
  ]);

  const verificationsMap = new Map<string, GovVerification>();
  allVerifications.forEach((v) => {
    verificationsMap.set(`${v.targetType}_${v.targetId}`, v);
  });

  const parcels: LandParcel[] = [];
  const buildings: GisBuilding[] = [];
  const floors: GisFloor[] = [];
  const properties: PropertyUnit[] = [];
  const demoSpatialIds: DemoSpatialIdentifier[] = [];

  for (const society of societies) {
    const baseUlpin = generateSocietyUlpin(society);
    const parcel = societyToLandParcel(society, baseUlpin);
    parcels.push(parcel);

    try {
      const societyBuildings = await getBuildings(society.id);

      for (let bIndex = 0; bIndex < societyBuildings.length; bIndex++) {
        const bldg = societyBuildings[bIndex];
        const gisBldg = buildingToGisBuilding(
          bldg,
          society.id,
          parcel.latitude,
          parcel.longitude,
          bIndex,
        );
        buildings.push(gisBldg);

        try {
          const bldgFloors = await getFloors(society.id, bldg.id);

          for (const floor of bldgFloors) {
            const gisFloor = floorToGisFloor(floor, bldg.id);
            floors.push(gisFloor);

            try {
              const floorFlats = await getFlats(society.id, bldg.id, floor.id);

              for (const flat of floorFlats) {
                const govVer = verificationsMap.get(`flat_${flat.id}`) || null;
                const propUnit = flatToPropertyUnit(
                  flat,
                  bldg,
                  floor,
                  society,
                  baseUlpin,
                  govVer,
                );
                properties.push(propUnit);

                const demoId = createDemoSpatialIdRecord(propUnit);
                demoSpatialIds.push(demoId);
              }
            } catch (err) {
              console.warn(`Could not load flats for floor ${floor.id}:`, err);
            }
          }
        } catch (err) {
          console.warn(`Could not load floors for building ${bldg.id}:`, err);
        }
      }
    } catch (err) {
      console.warn(`Could not load buildings for society ${society.id}:`, err);
    }
  }

  return {
    parcels,
    buildings,
    floors,
    properties,
    demoSpatialIds,
  };
}
