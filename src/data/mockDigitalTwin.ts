/**
 * Mock data for the Building Digital Twin page.
 * Self-contained demo dataset — Green Valley Residency, Pune.
 * 12 floors (Ground + 01..11) × 4 units = 48 units.
 */

export type TwinVerificationStatus = "VERIFIED" | "PENDING" | "UNDER_REVIEW" | "DISPUTED";

export interface TwinUnit {
  id: string;
  number: string; // "601", "G-01"
  floorLevel: number;
  type: "1BHK" | "2BHK" | "3BHK" | "4BHK" | "PENTHOUSE" | "RETAIL";
  areaSqFt: number;
  ownerName: string;
  ownerAadhaarMasked: string;
  occupancy: "OCCUPIED" | "VACANT" | "LEASED";
  status: TwinVerificationStatus;
  taxAssessment: string;
  healthScore: number;
}

export interface TwinFloor {
  level: number; // 0 = ground .. 11
  label: string; // "Ground Floor", "Floor 01" ...
  elevationM: number;
  areaSqFt: number;
  units: TwinUnit[];
  status: TwinVerificationStatus;
}

export interface TwinActivity {
  id: string;
  icon: "check" | "map" | "file" | "warning" | "info";
  text: string;
  time: string;
  tone: "success" | "cyan" | "warning";
}

export interface TwinBuildingInfo {
  name: string;
  propertyId: string;
  ulpin: string;
  location: string;
  cityState: string;
  type: string;
  totalFloors: number;
  totalUnits: number;
  builtUpAreaSqFt: number;
  constructionYear: number;
  heightM: number;
  occupiedUnits: number;
  vacantUnits: number;
  leasedUnits: number;
  propertyHealth: number;
  verificationScore: number;
  verificationStatus: "VERIFIED";
  systemStatus: "ACTIVE";
  latitude: number;
  longitude: number;
}

export const TWIN_BUILDING: TwinBuildingInfo = {
  name: "Green Valley Residency",
  propertyId: "PROP-2026-10482",
  ulpin: "ULPIN-27-4589-1023",
  location: "Pune, Maharashtra",
  cityState: "Baner-Pashan Link Road, Pune, Maharashtra 411045",
  type: "Residential Apartment",
  totalFloors: 12,
  totalUnits: 48,
  builtUpAreaSqFt: 18500,
  constructionYear: 2019,
  heightM: 42,
  occupiedUnits: 38,
  vacantUnits: 6,
  leasedUnits: 4,
  propertyHealth: 94,
  verificationScore: 92,
  verificationStatus: "VERIFIED",
  systemStatus: "ACTIVE",
  latitude: 18.5597,
  longitude: 73.7892,
};

const OWNERS = [
  { name: "Rajesh V. Sharma", mask: "XXXX-XXXX-8921" },
  { name: "Sunita V. Deshpande", mask: "XXXX-XXXX-1199" },
  { name: "Venkat Rao Deshmukh", mask: "XXXX-XXXX-4019" },
  { name: "Priya R. Kulkarni", mask: "XXXX-XXXX-8834" },
  { name: "Arjun Mehta", mask: "XXXX-XXXX-4432" },
  { name: "Farah Ansari", mask: "XXXX-XXXX-7756" },
  { name: "Karthik Subramaniam", mask: "XXXX-XXXX-2271" },
  { name: "Neha Verma", mask: "XXXX-XXXX-6618" },
];

const UNIT_TYPES: Array<TwinUnit["type"]> = ["2BHK", "3BHK", "3BHK", "4BHK"];
const AREAS: Record<string, number> = { "1BHK": 260, "2BHK": 300, "3BHK": 380, "4BHK": 480, PENTHOUSE: 620, RETAIL: 420 };
function makeFloor(level: number, overrides: Record<string, Partial<TwinUnit>> = {}): TwinFloor {
  const units: TwinUnit[] = Array.from({ length: 4 }, (_, i) => {
    const num = level === 0 ? `G-0${i + 1}` : `${String(level).padStart(2, "0")}${i + 1}`;
    const type = UNIT_TYPES[i % UNIT_TYPES.length];
    const owner = OWNERS[(level * 4 + i) % OWNERS.length];
    const unit: TwinUnit = {
      id: `u-${level}-${i}`,
      number: num,
      floorLevel: level,
      type,
      areaSqFt: AREAS[type],
      ownerName: owner.name,
      ownerAadhaarMasked: owner.mask,
      occupancy: i === 1 ? "LEASED" : i === 3 ? "VACANT" : "OCCUPIED",
      status: "VERIFIED",
      taxAssessment: `TAX-GV-${num}`,
      healthScore: 88 + ((level + i) % 10),
    };
    return overrides[num] ? { ...unit, ...overrides[num] } : unit;
  });

  const statuses = units.map((u) => u.status);
  const status: TwinVerificationStatus = statuses.includes("DISPUTED")
    ? "DISPUTED"
    : statuses.some((s) => s === "PENDING" || s === "UNDER_REVIEW")
    ? "PENDING"
    : "VERIFIED";

  return {
    level,
    label: level === 0 ? "Ground Floor" : `Floor ${String(level).padStart(2, "0")}`,
    elevationM: level * 3.5,
    areaSqFt: units.reduce((acc, u) => acc + u.areaSqFt, 0),
    units,
    status,
  };
}

export const TWIN_FLOORS: TwinFloor[] = [
  makeFloor(0),
  makeFloor(1),
  makeFloor(2),
  makeFloor(3),
  makeFloor(4),
  makeFloor(5),
  makeFloor(6, {
    "603": { status: "PENDING", occupancy: "VACANT" },
    "604": { status: "UNDER_REVIEW", ownerName: "Pending owner settlement", ownerAadhaarMasked: "XXXX-XXXX-0000" },
  }),
  makeFloor(7),
  makeFloor(8),
  makeFloor(9, { "602": { status: "PENDING", occupancy: "VACANT" } }),
  makeFloor(10, { "604": { status: "PENDING", occupancy: "VACANT" } }),
  makeFloor(11, {
    "1101": { status: "DISPUTED", ownerName: "Disputed — Khata hold", ownerAadhaarMasked: "XXXX-XXXX-9999" },
    "1103": { status: "DISPUTED", ownerName: "Disputed — boundary variance", ownerAadhaarMasked: "XXXX-XXXX-8888" },
  }),
];

export const TWIN_ACTIVITIES: TwinActivity[] = [
  { id: "act-1", icon: "check", text: "Property Floor 06 verified", time: "2 minutes ago", tone: "success" },
  { id: "act-2", icon: "map", text: "Government officer completed field inspection", time: "15 minutes ago", tone: "cyan" },
  { id: "act-3", icon: "file", text: "Building documents updated", time: "1 hour ago", tone: "cyan" },
  { id: "act-4", icon: "warning", text: "Unit 604 requires correction", time: "2 hours ago", tone: "warning" },
  { id: "act-5", icon: "check", text: "Property successfully verified", time: "Yesterday", tone: "success" },
];

export const TWIN_SYSTEM_STATUS = [
  { label: "Structural Records", value: 100 },
  { label: "Property Documents", value: 95 },
  { label: "Floor Information", value: 100 },
  { label: "Unit Verification", value: 90 },
  { label: "Map Coordinates", value: 100 },
];

export const TWIN_ANALYTICS = [
  { label: "Total Floors", value: 12, sparkline: [9, 10, 10, 11, 11, 12], color: "#00D9FF" },
  { label: "Property Units", value: 48, sparkline: [30, 36, 40, 44, 46, 48], color: "#008CFF" },
  { label: "Verified Units", value: 42, sparkline: [24, 30, 34, 38, 40, 42], color: "#22C55E" },
  { label: "Pending Units", value: 4, sparkline: [4, 5, 3, 4, 5, 4], color: "#FACC15" },
  { label: "Disputed Units", value: 2, sparkline: [1, 2, 1, 2, 2, 2], color: "#EF4444" },
];