/**
 * Resident → Property resolver (Phase 3)
 * =======================================
 * Structural property data is NEVER copied into the resident document.
 * When a resident's society/building/floor/flat must be displayed, the
 * actual Phase 1/2 documents are resolved live here so that Phase 2 data
 * stays authoritative (normalised data model — see Phase 3 spec §40).
 */
import type { Building, Flat, Floor, Resident, Society } from '@/types/society';

import { getBuilding } from './buildingService';
import { getFlat } from './flatService';
import { getFloor } from './floorService';
import { getSocietyById } from './service';

export interface ResolvedResidentProperty {
  society: Society | null;
  building: Building | null;
  floor: Floor | null;
  flat: Flat | null;
}

/**
 * Resolves the full hierarchy referenced by a resident record. Individual
 * lookups degrade to `null` (e.g. a Phase 2 record was deleted) instead of
 * failing the whole page.
 */
export async function resolveResidentProperty(
  resident: Resident,
): Promise<ResolvedResidentProperty> {
  const [society, building, floor, flat] = await Promise.all([
    getSocietyById(resident.societyId).catch(() => null),
    getBuilding(resident.societyId, resident.buildingId).catch(() => null),
    getFloor(resident.societyId, resident.buildingId, resident.floorId).catch(() => null),
    getFlat(resident.societyId, resident.buildingId, resident.floorId, resident.flatId).catch(
      () => null,
    ),
  ]);
  return { society, building, floor, flat };
}