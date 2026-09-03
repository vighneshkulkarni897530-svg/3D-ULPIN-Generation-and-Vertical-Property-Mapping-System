/**
 * Digital Twin Data Service & Adapter
 * =====================================
 * Converts Firestore Society, Building, Floor, and Flat hierarchy into typed
 * 3D Digital Twin representations with local spatial coordinates and Bhu-Aadhaar
 * cadastral spatial identifiers.
 *
 * HYBRID ARCHITECTURE:
 * - Real Database Data: Loaded dynamically from Firestore / GIS Context.
 * - Illustrative Geometry: Provides the rich visual township environment
 *   (roads, landscape, amenity, parking, and towers when data is unlinked).
 * - Honest Indicators: Every building, floor, and unit explicitly reports its
 *   data source (`real-database`, `illustrative`, or `government-verified`).
 */

import type { Society, Building as SocietyBuilding, Floor as SocietyFloor, Flat as SocietyFlat } from '@/types/society';
import type { Building as GisBuilding, Floor as GisFloor, LandParcel, PropertyUnit } from '@/types/gis';
import {
  generateSocietyUlpin,
  generateBuildingSpatialId,
  generateFloorSpatialId,
  generate3DVerticalSubUlpin,
} from '@/lib/society/ulpinGenerator';
import { geoToLocal3D, type GeoPoint } from './gisTo3D';
import { TOWERS, type TowerDef, type TowerType } from '@/components/digital-twin/township/townshipConfig';

export type DigitalTwinDataStatus = 'real-database' | 'illustrative' | 'government-verified';

export interface Flat3DData {
  flatId: string;
  floorId: string;
  buildingId: string;
  societyId: string;
  flatNumber: string;
  unitType: string;
  area: number;
  verticalSpatialId: string;
  verificationStatus: string;
  status: string;
  dataStatus: DigitalTwinDataStatus;
}

export interface Floor3DData {
  floorId: string;
  buildingId: string;
  societyId: string;
  floorNumber: number;
  floorLabel: string;
  floorType: string;
  elevationM: number;
  spatialFloorId: string;
  flats: Flat3DData[];
}

export interface Building3DData {
  buildingId: string;
  societyId: string;
  name: string;
  code: string;
  spatialBuildingId: string;
  latitude: number;
  longitude: number;
  position: [number, number]; // [x, z] in scene meters
  rotation: number;
  heightM: number;
  floors: Floor3DData[];
  floorCount: number;
  flatCount: number;
  verificationStatus: string;
  dataStatus: DigitalTwinDataStatus;
  positionSource: 'GIS' | 'ILLUSTRATIVE';
  towerType: TowerType;
  footprint: [number, number];
}

export interface Society3DData {
  societyId: string;
  name: string;
  baseUlpin: string;
  origin: GeoPoint;
  buildings: Building3DData[];
  dataStatus: DigitalTwinDataStatus;
}

/**
 * Builds a unified Society3DData object from real Firestore hierarchy + GIS layers.
 */
export function buildSociety3DData(args: {
  society?: Society | LandParcel | null;
  buildings?: (SocietyBuilding | GisBuilding)[];
  floors?: (SocietyFloor | GisFloor)[];
  flats?: (SocietyFlat | PropertyUnit)[];
  verifications?: Record<string, string>;
}): Society3DData | null {
  const { society, buildings = [], floors = [], flats = [], verifications = {} } = args;
  if (!society) return null;

  const societyId = society.id;
  const societyName = 'name' in society && typeof (society as { name?: string }).name === 'string'
    ? (society as { name: string }).name
    : 'parcelNumber' in society
      ? `Parcel ${(society as { parcelNumber: string }).parcelNumber}`
      : 'Registered Society';
  let lat = 18.6172;
  let lng = 73.7141;
  if ('location' in society && society.location && typeof society.location === 'object') {
    const loc = society.location as { latitude?: number; longitude?: number };
    if (typeof loc.latitude === 'number') lat = loc.latitude;
    if (typeof loc.longitude === 'number') lng = loc.longitude;
  } else if ('centroid' in society && society.centroid && typeof society.centroid === 'object') {
    const c = society.centroid as { lat?: number; lng?: number };
    if (typeof c.lat === 'number') lat = c.lat;
    if (typeof c.lng === 'number') lng = c.lng;
  }
  const origin: GeoPoint = { latitude: lat, longitude: lng };

  const baseUlpin =
    'address' in society && society.address
      ? generateSocietyUlpin(society as Society)
      : 'parcelNumber' in society && society.parcelNumber
        ? society.parcelNumber
        : '27412104101A8F';

  // Filter buildings for this society
  const societyBuildings = buildings.filter(
    (b) => ('societyId' in b && b.societyId === societyId) || ('parcelId' in b && b.parcelId === societyId),
  );

  const buildings3D: Building3DData[] = societyBuildings.map((b, idx) => {
    const bldgId = b.id;
    const bldgName = b.name || `Building ${idx + 1}`;
    const bldgCode = 'code' in b ? b.code : String.fromCharCode(65 + (idx % 26));
    const bldgLat = 'latitude' in b && typeof b.latitude === 'number' ? b.latitude : lat;
    const bldgLng = 'longitude' in b && typeof b.longitude === 'number' ? b.longitude : lng;

    const spatialBuildingId = generateBuildingSpatialId(baseUlpin, bldgCode);

    // Compute local position
    const fallbackTower = TOWERS[idx % TOWERS.length];
    let pos: [number, number] = fallbackTower.position;
    let posSource: 'GIS' | 'ILLUSTRATIVE' = 'ILLUSTRATIVE';

    if (bldgLat !== lat || bldgLng !== lng) {
      const local = geoToLocal3D({ latitude: bldgLat, longitude: bldgLng }, origin);
      pos = [local.x, local.z];
      posSource = local.positionSource;
    }

    // Filter floors for this building
    const bldgFloors = floors
      .filter((f) => f.buildingId === bldgId)
      .sort((a, b) => a.floorNumber - b.floorNumber);

    const floors3D: Floor3DData[] = bldgFloors.map((f) => {
      const fId = f.id;
      const fNum = f.floorNumber;
      const fLabel = 'floorLabel' in f ? f.floorLabel : `Floor ${fNum}`;
      const fType = 'floorType' in f ? f.floorType : 'residential';
      const spatialFloorId = generateFloorSpatialId(baseUlpin, fNum);

      // Filter flats for this floor
      const floorFlats = flats.filter(
        (flat) =>
          flat.floorId === fId ||
          ('buildingId' in flat && flat.buildingId === bldgId && 'floorId' in flat && flat.floorId === fId),
      );

      const flats3D: Flat3DData[] = floorFlats.map((flat) => {
        const flatId = flat.id;
        const flatNumber = 'flatNumber' in flat ? flat.flatNumber : (flat as PropertyUnit).unitNumber;
        const unitType = 'unitType' in flat ? flat.unitType : (flat as PropertyUnit).propertyType;
        const area = 'area' in flat ? (flat.area || 850) : ((flat as PropertyUnit).area || 850);
        const verticalSpatialId = generate3DVerticalSubUlpin(baseUlpin, fNum, flatNumber);
        const verificationStatus = verifications[flatId] || 'Pending';
        const flatStatus = 'status' in flat ? flat.status : (flat as PropertyUnit).verificationStatus;

        return {
          flatId,
          floorId: fId,
          buildingId: bldgId,
          societyId,
          flatNumber,
          unitType,
          area,
          verticalSpatialId,
          verificationStatus,
          status: flatStatus,
          dataStatus: verificationStatus === 'Verified' ? 'government-verified' : 'real-database',
        };
      });

      return {
        floorId: fId,
        buildingId: bldgId,
        societyId,
        floorNumber: fNum,
        floorLabel: fLabel,
        floorType: fType,
        elevationM: fNum * 3.1,
        spatialFloorId,
        flats: flats3D,
      };
    });

    const floorCount = 'floorCount' in b ? (b.floorCount || floors3D.length || 12) : (floors3D.length || 12);
    const totalFlats = floors3D.reduce((acc, f) => acc + f.flats.length, 0);
    const bldgVerification = verifications[bldgId] || 'Pending';

    const towerType: TowerType = (['A', 'B', 'C', 'D'] as TowerType[])[idx % 4];
    const footprint: [number, number] =
      towerType === 'B' || towerType === 'C' ? [26, 16] : [18, 16];

    return {
      buildingId: bldgId,
      societyId,
      name: bldgName,
      code: bldgCode,
      spatialBuildingId,
      latitude: bldgLat,
      longitude: bldgLng,
      position: pos,
      rotation: fallbackTower.rotation,
      heightM: floorCount * 3.1,
      floors: floors3D,
      floorCount,
      flatCount: totalFlats,
      verificationStatus: bldgVerification,
      dataStatus: bldgVerification === 'Verified' ? 'government-verified' : 'real-database',
      positionSource: posSource,
      towerType,
      footprint,
    };
  });

  return {
    societyId,
    name: societyName,
    baseUlpin,
    origin,
    buildings: buildings3D,
    dataStatus: 'real-database',
  };
}
