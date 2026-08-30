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
];

/** Convenience lookup by ID. */
export const FLOOR_BY_ID = new Map(MOCK_FLOORS.map((f) => [f.id, f]));
