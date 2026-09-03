/**
 * Phase 19 — Canonical Digital-Twin View Adapter
 * =============================================
 *
 * Single source of truth that derives the Digital-Twin presentation models
 * (`TwinBuildingInfo` / `TwinFloor[]` / `TwinUnit[]`) from the REAL
 * cadastral datasets (`buildings` / `floors` / property units / parcel) that
 * the rest of the application already uses.
 *
 * ROOT-CAUSE FIX (Phase 19): the digital-twin page previously rendered the
 * legacy "Green Valley Residency" illustration mock (12 floors / 42 m /
 * 48 units / 3.5 m floor height) inside panels that must show the actual
 * selected registry building — e.g. Tower B of Kolte Patil Life Republic
 * Penthouses (20 floors / 62.0 m / 3.1 m floor height / Floor 4 = 12.4 m).
 *
 * This adapter guarantees:
 *   • identity — the selected 3D tower and the data panels describe the
 *     SAME entity;
 *   • elevations follow the canonical floor records (floorNumber × 3.1 m
 *     for the Life Republic towers), never a parallel mock formula;
 *   • honest labelling — demo spatial identifiers are always flagged
 *     `isOfficialUlpin: false`, `dataStatus: "DEMO"`, `sourceType: "ILLUSTRATIVE"`.
 *
 * The legacy Green Valley mock is used ONLY as an illustrative fallback when
 * no real registry building is linked (generic/unlinked townships).
 */
import type { Building, Floor, LandParcel, PropertyUnit } from "@/types/gis";
import type { PropertyItem } from "@/types";
import { gisStatusToTwin } from "@/lib/gisAdapters";
import {
  TWIN_BUILDING,
  TWIN_FLOORS,
  type TwinBuildingInfo,
  type TwinFloor,
  type TwinUnit,
} from "@/data/mockDigitalTwin";

/** Canonical Life Republic floor-to-floor height (metres). */
export const LR_FLOOR_HEIGHT_M = 3.1;

export interface TwinViewInput {
  /** The resolved registry building for the selected tower (may be null). */
  building: Building | null;
  /** Registry floor records belonging to that building. */
  floors: Floor[];
  /** Registry property units belonging to that building. */
  units: PropertyUnit[];
  /** The resolved registry parcel (society) for that building (may be null). */
  parcel: LandParcel | null;
  /** The canonical PropertyItem featured on this route (e.g. PROP-LR-B-0402). */
  featured: PropertyItem | null;
}

export interface TwinView {
  building: TwinBuildingInfo;
  floors: TwinFloor[];
  /** True when the view was derived from the real registry (not the mock). */
  linked: boolean;
}

/** Deterministic unit-configuration mapping from the canonical registry unit. */
function unitTypeFor(u: PropertyUnit): TwinUnit["type"] {
  if (u.propertyType === "COMMERCIAL") return "RETAIL";
  if (u.area >= 2000) return "PENTHOUSE";
  if (u.area >= 1150) return "3BHK";
  if (u.area >= 900) return "2BHK";
  return "1BHK";
}

/**
 * Occupancy is NOT tracked on registry units — derive an honest marker from
 * the verification status instead of fabricating occupancy data.
 */
function occupancyFor(u: PropertyUnit): TwinUnit["occupancy"] {
  if (u.verificationStatus === "Verified") return "OCCUPIED";
  if (u.verificationStatus === "Reinspection Required") return "LEASED";
  return "VACANT";
}

/** Registry units carry no PII by design — never fabricate an Aadhaar mask. */
const PII_PLACEHOLDER = "PROTECTED";

function unitToTwin(u: PropertyUnit, floorLevel: number): TwinUnit {
  return {
    id: u.id,
    number: u.unitNumber,
    floorLevel,
    type: unitTypeFor(u),
    areaSqFt: Math.round(u.area),
    ownerName: u.ownerReferenceName,
    ownerAadhaarMasked: PII_PLACEHOLDER,
    occupancy: occupancyFor(u),
    status: gisStatusToTwin(u.verificationStatus),
    taxAssessment: `TAX-${u.id.replace(/^PROP-/, "")}`,
    healthScore: Math.round(
      Math.min(1, Math.max(0, u.demoSpatialIdMetadata?.confidence ?? 0.9)) * 100,
    ),
    // canonical linkage
    propertyRecordId: u.propertyId,
    demoSpatialId: u.demoSpatialId,
    fromRegistry: true,
    sourceType: "REGISTRY",
  };
}
export function buildTwinView(input: TwinViewInput): TwinView {
  const { building, floors, units, parcel, featured } = input;

  if (!building) {
    // No registry linkage — fall back to the illustrative mock dataset.
    return { building: TWIN_BUILDING, floors: TWIN_FLOORS, linked: false };
  }

  const sortedFloors = [...floors].sort((a, b) => a.floorNumber - b.floorNumber);

  const twinFloors: TwinFloor[] = sortedFloors.map((f) => {
    const floorUnits = units
      .filter((u) => u.floorId === f.id)
      .map((u) => unitToTwin(u, f.floorNumber));

    const statuses = floorUnits.map((u) => u.status);
    const status = statuses.includes("DISPUTED")
      ? ("DISPUTED" as const)
      : statuses.some((s) => s === "PENDING" || s === "UNDER_REVIEW")
        ? ("PENDING" as const)
        : ("VERIFIED" as const);

    return {
      level: f.floorNumber,
      label:
        f.floorNumber === 0
          ? "Ground Floor"
          : `Floor ${String(f.floorNumber).padStart(2, "0")}`,
      // Canonical elevation: floorNumber × 3.1 m (Life Republic floor record
      // formula) — never a parallel mock formula such as 3.5 m.
      elevationM: Number((f.floorNumber * LR_FLOOR_HEIGHT_M).toFixed(1)),
      areaSqFt: Math.round(f.area),
      units: floorUnits,
      status,
      floorId: f.id,
    };
  });

  const verified = units.filter((u) => u.verificationStatus === "Verified").length;
  const leased = units.filter((u) => u.verificationStatus === "Reinspection Required").length;
  const vacant = Math.max(0, units.length - verified - leased);

  const confidenceScores = units.map(
    (u) => u.demoSpatialIdMetadata?.confidence ?? 0.9,
  );
  const propertyHealth = confidenceScores.length
    ? Math.round(
        (confidenceScores.reduce((a, c) => a + c, 0) / confidenceScores.length) * 100,
      )
    : 90;
  const verificationScore = units.length
    ? Math.round((verified / units.length) * 100)
    : 80;

  const twinBuilding: TwinBuildingInfo = {
    name: building.name,
    // Featured route property (PROP-LR-B-0402) wins; else first registry unit.
    propertyId: featured?.propertyId ?? units[0]?.propertyId ?? building.id,
    // The vertical demo spatial identifier — never an official ULPIN.
    ulpin: featured?.ulpin ?? units[0]?.demoSpatialId ?? "",
    location: parcel?.location ?? building.address,
    cityState: building.address,
    type: units.some((u) => u.propertyType === "COMMERCIAL")
      ? "Mixed-Use Residential Tower"
      : "Residential Apartment",
    totalFloors: building.totalFloors,
    totalUnits:
      sortedFloors.reduce((acc, f) => acc + f.totalUnits, 0) || units.length,
    builtUpAreaSqFt: building.builtUpArea,
    constructionYear: building.yearBuilt,
    heightM: building.height,
    occupiedUnits: verified,
    vacantUnits: vacant,
    leasedUnits: leased,
    propertyHealth,
    verificationScore,
    verificationStatus: "VERIFIED",
    systemStatus: "ACTIVE",
    latitude: building.latitude,
    longitude: building.longitude,
    // ── canonical registry linkage ──────────────────────────────────────────
    buildingId: building.id,
    buildingCode: building.buildingCode,
    parcelId: building.parcelId,
    surveyNumber: featured?.landDetails?.surveyNumber,
    dataStatus: "DEMO",
    sourceType: "ILLUSTRATIVE",
    isOfficialUlpin: false,
  };

  return { building: twinBuilding, floors: twinFloors, linked: true };
}

/** Finds a TwinUnit across all floors by registry id, unit number or flat code. */
export function findTwinUnit(
  floors: TwinFloor[],
  identifier: string | null | undefined,
): TwinUnit | null {
  if (!identifier) return null;
  const needle = identifier.trim().toLowerCase();
  for (const floor of floors) {
    const hit = floor.units.find(
      (u) =>
        u.id.toLowerCase() === needle ||
        u.number.toLowerCase() === needle ||
        u.propertyRecordId?.toLowerCase() === needle ||
        u.demoSpatialId?.toLowerCase() === needle,
    );
    if (hit) return hit;
  }
  return null;
}
