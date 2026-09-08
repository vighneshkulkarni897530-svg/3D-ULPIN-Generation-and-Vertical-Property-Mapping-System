/**
 * Centralized Floor demo data
 * ============================
 * Floors for each building defined in `buildings.ts`.
 *
 * Hierarchy:  Building → Floor → PropertyUnit
 *
 * IDs follow the pattern: FLOOR-102-G, FLOOR-102-1, etc.
 */
import type { Floor } from '@/types/gis';

export const MOCK_FLOORS: Floor[] = [
  // ── Building B-102: Green View Residency (5 floors) ──
  {
    id: 'FLOOR-102-G',
    buildingId: 'B-102',
    floorNumber: 0,
    name: 'Ground Floor - Retail & Lobby',
    elevation: 0,
    area: 6200,
    totalUnits: 3,
  },
  {
    id: 'FLOOR-102-1',
    buildingId: 'B-102',
    floorNumber: 1,
    name: '1st Floor - Residential',
    elevation: 3.5,
    area: 6800,
    totalUnits: 3,
  },
  {
    id: 'FLOOR-102-2',
    buildingId: 'B-102',
    floorNumber: 2,
    name: '2nd Floor - Residential',
    elevation: 6.8,
    area: 6800,
    totalUnits: 2,
  },
  {
    id: 'FLOOR-102-3',
    buildingId: 'B-102',
    floorNumber: 3,
    name: '3rd Floor - Residential',
    elevation: 10.2,
    area: 6000,
    totalUnits: 2,
  },
  {
    id: 'FLOOR-102-4',
    buildingId: 'B-102',
    floorNumber: 4,
    name: '4th Floor - Residential',
    elevation: 13.6,
    area: 4600,
    totalUnits: 2,
  },

  // ── Building B-104: Shree Krishna Arcade (5 floors) ──
  {
    id: 'FLOOR-104-G',
    buildingId: 'B-104',
    floorNumber: 0,
    name: 'Ground Floor - Retail & Lobby',
    elevation: 0,
    area: 5200,
    totalUnits: 2,
  },
  {
    id: 'FLOOR-104-1',
    buildingId: 'B-104',
    floorNumber: 1,
    name: '1st Floor - Residential',
    elevation: 3.2,
    area: 5100,
    totalUnits: 2,
  },
  {
    id: 'FLOOR-104-2',
    buildingId: 'B-104',
    floorNumber: 2,
    name: '2nd Floor - Residential',
    elevation: 6.4,
    area: 5100,
    totalUnits: 1,
  },
  {
    id: 'FLOOR-104-3',
    buildingId: 'B-104',
    floorNumber: 3,
    name: '3rd Floor - Office Suite',
    elevation: 9.6,
    area: 4800,
    totalUnits: 1,
  },
  {
    id: 'FLOOR-104-4',
    buildingId: 'B-104',
    floorNumber: 4,
    name: '4th Floor - Office Suites',
    elevation: 12.8,
    area: 4800,
    totalUnits: 1,
  },

  // ── Building B-306: Tech Tower (6 floors) ──
  {
    id: 'FLOOR-306-G',
    buildingId: 'B-306',
    floorNumber: 0,
    name: 'Ground Floor - Retail & Lobby',
    elevation: 0,
    area: 7200,
    totalUnits: 2,
  },
  {
    id: 'FLOOR-306-1',
    buildingId: 'B-306',
    floorNumber: 1,
    name: '1st Floor - Office Suites',
    elevation: 3.8,
    area: 8200,
    totalUnits: 2,
  },
  {
    id: 'FLOOR-306-2',
    buildingId: 'B-306',
    floorNumber: 2,
    name: '2nd Floor - Office Suites',
    elevation: 7.6,
    area: 8200,
    totalUnits: 1,
  },
  {
    id: 'FLOOR-306-3',
    buildingId: 'B-306',
    floorNumber: 3,
    name: '3rd Floor - Office Suites',
    elevation: 11.4,
    area: 8200,
    totalUnits: 1,
  },
    {
    id: 'FLOOR-306-4',
    buildingId: 'B-306',
    floorNumber: 4,
    name: '4th Floor - Office Suites',
    elevation: 15.2,
    area: 6500,
    totalUnits: 1,
  },

  // ── Green View Residency Additional Wings (B-102-W2, B-102-W3: 5 floors each) ──
  ...['B-102-W2', 'B-102-W3'].flatMap((bId) =>
    Array.from({ length: 5 }, (_, flNum) => ({
      id: `FLOOR-${bId}-${flNum === 0 ? 'G' : flNum}`,
      buildingId: bId,
      floorNumber: flNum,
      name: flNum === 0 ? 'Ground Floor - Reception & Lobby' : `Floor ${flNum} - Residential`,
      elevation: Number((flNum * 3.4).toFixed(1)),
      area: 6200,
      totalUnits: 2,
    }))
  ),

  // ── Shree Krishna Arcade Additional Wings (B-104-W2 to B-104-W5: 5 floors each) ──
  ...['B-104-W2', 'B-104-W3', 'B-104-W4', 'B-104-W5'].flatMap((bId) =>
    Array.from({ length: 5 }, (_, flNum) => ({
      id: `FLOOR-${bId}-${flNum === 0 ? 'G' : flNum}`,
      buildingId: bId,
      floorNumber: flNum,
      name: flNum === 0 ? 'Ground Floor - Commercial Arcade' : `Floor ${flNum} - Commercial / Residential`,
      elevation: Number((flNum * 3.2).toFixed(1)),
      area: 5000,
      totalUnits: 2,
    }))
  ),

  // ── Tech Tower Beta Block (B-306-B: 5 floors) ──
  ...['B-306-B'].flatMap((bId) =>
    Array.from({ length: 5 }, (_, flNum) => ({
      id: `FLOOR-${bId}-${flNum === 0 ? 'G' : flNum}`,
      buildingId: bId,
      floorNumber: flNum,
      name: flNum === 0 ? 'Ground Floor - Server Facility & Reception' : `Floor ${flNum} - Corporate IT Suites`,
      elevation: Number((flNum * 3.8).toFixed(1)),
      area: 7500,
      totalUnits: 2,
    }))
  ),

  // ── Wakad Heights (PARCEL-MH-PUN-004): B-401 to B-404 (4 floors each: 0..3) ──
  ...['B-401', 'B-402', 'B-403', 'B-404'].flatMap((bId) => [
    {
      id: `FLOOR-${bId}-G`,
      buildingId: bId,
      floorNumber: 0,
      name: 'Ground Floor - Resident Lobby',
      elevation: 0,
      area: 5500,
      totalUnits: 2,
    },
    {
      id: `FLOOR-${bId}-1`,
      buildingId: bId,
      floorNumber: 1,
      name: '1st Floor - Residential',
      elevation: 3.2,
      area: 5500,
      totalUnits: 2,
    },
    {
      id: `FLOOR-${bId}-2`,
      buildingId: bId,
      floorNumber: 2,
      name: '2nd Floor - Residential',
      elevation: 6.4,
      area: 5500,
      totalUnits: 2,
    },
    {
      id: `FLOOR-${bId}-3`,
      buildingId: bId,
      floorNumber: 3,
      name: '3rd Floor - Penthouse & Terrace',
      elevation: 9.6,
      area: 5500,
      totalUnits: 2,
    },
  ]),

  // ── Hinjewadi Tech Enclave (PARCEL-MH-PUN-005): B-501 to B-506 (6 floors each: 0..5) ──
  ...['B-501', 'B-502', 'B-503', 'B-504', 'B-505', 'B-506'].flatMap((bId) =>
    Array.from({ length: 6 }, (_, flNum) => ({
      id: `FLOOR-${bId}-${flNum}`,
      buildingId: bId,
      floorNumber: flNum,
      name: flNum === 0 ? 'Ground Floor - Reception & Parking' : `Floor ${flNum} - Residential`,
      elevation: Number((flNum * 3.1).toFixed(1)),
      area: 5300,
      totalUnits: 2,
    }))
  ),

  // ── Amanora Elegance (PARCEL-MH-PUN-006): B-601 & B-602 (16 floors each: 0..15) ──
  ...['B-601', 'B-602'].flatMap((bId) =>
    Array.from({ length: 16 }, (_, flNum) => ({
      id: `FLOOR-${bId}-${flNum}`,
      buildingId: bId,
      floorNumber: flNum,
      name: flNum === 0 ? 'Ground Floor - Grand Atrium' : flNum === 15 ? '15th Floor - Sky Penthouse' : `Floor ${flNum} - Residences`,
      elevation: Number((flNum * 3.1).toFixed(1)),
      area: 4250,
      totalUnits: 4,
    }))
  ),

  // ── Kolte Patil Life Republic: Tower B (20 Floors: 0..20) ──
  {
    id: 'FLOOR-LR-B-G',
    buildingId: 'B-LR-B',
    floorNumber: 0,
    name: 'Ground Floor - Grand Lobby & Concierge',
    elevation: 0,
    area: 4800,
    totalUnits: 4,
  },
  ...Array.from({ length: 20 }, (_, i) => {
    const flNum = i + 1;
    return {
      id: `FLOOR-LR-B-${String(flNum).padStart(2, '0')}`,
      buildingId: 'B-LR-B',
      floorNumber: flNum,
      name: flNum === 20 ? '20th Floor - Sky Penthouses' : flNum === 4 ? '4th Floor - Premium Residences' : `Floor ${flNum} - Residential Units`,
      elevation: Number((flNum * 3.1).toFixed(1)),
      area: 4200,
      totalUnits: 4,
    };
  }),

  // ── Tower A (24 Floors: 0..24) ──
  ...Array.from({ length: 25 }, (_, i) => ({
    id: `FLOOR-LR-A-${String(i).padStart(2, '0')}`,
    buildingId: 'B-LR-A',
    floorNumber: i,
    name: i === 0 ? 'Ground Floor - Atrium Lobby' : i === 24 ? '24th Floor - Penthouse Suite' : `Floor ${i} - Luxury Residences`,
    elevation: Number((i * 3.1).toFixed(1)),
    area: 4500,
    totalUnits: 4,
  })),

  // ── Tower C (22 Floors: 0..22) ──
  ...Array.from({ length: 23 }, (_, i) => ({
    id: `FLOOR-LR-C-${String(i).padStart(2, '0')}`,
    buildingId: 'B-LR-C',
    floorNumber: i,
    name: i === 0 ? 'Ground Floor - Reception & Club Lounge' : `Floor ${i} - Residential`,
    elevation: Number((i * 3.1).toFixed(1)),
    area: 4400,
    totalUnits: 4,
  })),

  // ── Tower D (18 Floors: 0..18) ──
  ...Array.from({ length: 19 }, (_, i) => ({
    id: `FLOOR-LR-D-${String(i).padStart(2, '0')}`,
    buildingId: 'B-LR-D',
    floorNumber: i,
    name: i === 0 ? 'Ground Floor - Resident Lobby' : `Floor ${i} - Residential`,
    elevation: Number((i * 3.1).toFixed(1)),
    area: 4000,
    totalUnits: 4,
  })),

  // ── Tower E (23 Floors: 0..23) ──
  ...Array.from({ length: 24 }, (_, i) => ({
    id: `FLOOR-LR-E-${String(i).padStart(2, '0')}`,
    buildingId: 'B-LR-E',
    floorNumber: i,
    name: i === 0 ? 'Ground Floor - Grand Foyer' : `Floor ${i} - Residential`,
    elevation: Number((i * 3.1).toFixed(1)),
    area: 4300,
    totalUnits: 4,
  })),
];

/** Convenience lookup by ID. */
export const FLOOR_BY_ID = new Map(MOCK_FLOORS.map((f) => [f.id, f]));

