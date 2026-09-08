/**
 * Phase 23 Automated Verification Test Script
 * ===========================================
 * Validates 3D Digital Twin configurations, isolation, building mappings,
 * and zero cross-contamination for all 7 GIS Land Parcels.
 */

import { MOCK_PARCELS, PARCEL_BY_ID } from '../src/data/parcels';
import { MOCK_BUILDINGS, BUILDING_BY_ID } from '../src/data/buildings';
import { MOCK_FLOORS } from '../src/data/floors';
import { MOCK_PROPERTIES } from '../src/data/properties';
import {
  getSocietyDigitalTwin,
  LIFE_REPUBLIC_DIGITAL_TWIN,
  SOCIETY_A_DIGITAL_TWIN,
  SOCIETY_B_DIGITAL_TWIN,
  SOCIETY_C_DIGITAL_TWIN,
  SOCIETY_D_DIGITAL_TWIN,
  SOCIETY_E_DIGITAL_TWIN,
  SOCIETY_F_DIGITAL_TWIN,
} from '../src/lib/digital-twin/digitalTwinRegistry';

interface TestResult {
  parcelId: string;
  societyName: string;
  status: 'READY' | 'SOURCE_IMAGE_REQUIRED' | 'FAILED';
  buildingCount: number;
  floorCountTotal: number;
  parkCount: number;
  parkingCount: number;
  amenityCount: number;
  waterCount: number;
  hasRoads: boolean;
  uniqueSignature: string;
}

console.log('======================================================================');
console.log('BHU-VERIFY PHASE 23 — 3D DIGITAL TWIN VERIFICATION FOR ALL 7 PARCELS');
console.log('======================================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` — ${detail}` : ''}`);
  }
}

// ── TEST SUITE 1: 7 Cadastral Parcels in Registry ───────────────────────────
console.log('[1] Checking Cadastral Parcels Existence (Exactly 7 expected)');
assert(MOCK_PARCELS.length === 7, `Total parcels in MOCK_PARCELS is 7 (actual: ${MOCK_PARCELS.length})`);

const expectedParcelIds = [
  'PARCEL-MH-PUN-001',
  'PARCEL-MH-PUN-002',
  'PARCEL-MH-PUN-003',
  'PARCEL-MH-PUN-004',
  'PARCEL-MH-PUN-005',
  'PARCEL-MH-PUN-006',
  'PARCEL-MH-PUN-074',
];

expectedParcelIds.forEach((pid) => {
  const parcel = PARCEL_BY_ID.get(pid);
  assert(Boolean(parcel), `Parcel ${pid} is present with parcelNumber "${parcel?.parcelNumber}"`);
});

// ── TEST SUITE 2: Buildings Existence per Parcel ────────────────────────────
console.log('\n[2] Checking Real Buildings Associated with Each Parcel');
expectedParcelIds.forEach((pid) => {
  const parcelBuildings = MOCK_BUILDINGS.filter((b) => b.parcelId === pid);
  assert(
    parcelBuildings.length > 0,
    `Parcel ${pid} has ${parcelBuildings.length} building(s) in MOCK_BUILDINGS (${parcelBuildings.map((b) => b.name).join(', ')})`
  );
});

// ── TEST SUITE 3: Digital Twin Registry Resolution for All 7 Parcels ─────────
console.log('\n[3] Validating Unique 3D Digital Twin for Each Parcel');
const results: TestResult[] = [];
const signatures = new Set<string>();

expectedParcelIds.forEach((pid) => {
  const twin = getSocietyDigitalTwin(pid);
  assert(Boolean(twin), `getSocietyDigitalTwin("${pid}") returned valid digital twin`);

  if (twin) {
    const bldgCount = twin.buildings?.length ?? 0;
    const parkCount = twin.parks?.length ?? 0;
    const parkingCount = twin.parkingAreas?.length ?? 0;
    const amenityCount = twin.amenities?.length ?? 0;
    const waterCount = twin.waterBodies?.length ?? 0;
    const hasRoads = (twin.roads?.segments?.length ?? 0) > 0;
    const totalFloors = twin.buildings?.reduce((sum, b) => sum + b.floors, 0) ?? 0;

    const signature = `${bldgCount}bldgs_${totalFloors}fl_${parkCount}prk_${parkingCount}pkg_${amenityCount}amn_${waterCount}wtr`;
    signatures.add(signature);

    results.push({
      parcelId: pid,
      societyName: twin.societyName,
      status: 'READY',
      buildingCount: bldgCount,
      floorCountTotal: totalFloors,
      parkCount,
      parkingCount,
      amenityCount,
      waterCount,
      hasRoads,
      uniqueSignature: signature,
    });

    console.log(
      `    -> [${pid}] ${twin.societyName}: ${bldgCount} bldgs (${totalFloors} fl total), ${parkCount} parks, ${parkingCount} parking, ${amenityCount} amenities, ${waterCount} water bodies`
    );
  }
});

// Verify all 7 twin signatures are distinct
assert(
  signatures.size === expectedParcelIds.length,
  `All ${expectedParcelIds.length} parcels have DISTINCT 3D scene signatures (unique count: ${signatures.size})`
);

// ── TEST SUITE 4: Zero Fallback Contamination & Honest Empty State ───────────
console.log('\n[4] Testing Zero Life Republic Contamination & Unconfigured Empty States');

const unconfiguredIds = ['PARCEL-MH-PUN-999', 'UNKNOWN_PARCEL', 'SOME_NEW_SOCIETY'];
unconfiguredIds.forEach((id) => {
  const result = getSocietyDigitalTwin(id);
  assert(
    result === null,
    `Unregistered ID "${id}" returns null (never silently falls back to Life Republic)`
  );
});

// Check that no other society contains Life Republic specific building IDs
expectedParcelIds.forEach((pid) => {
  if (pid !== 'PARCEL-MH-PUN-074') {
    const twin = getSocietyDigitalTwin(pid);
    const hasTowerA = twin?.buildings?.some((b) => b.id === 'B-LR-A' || b.id === 'B-LR-B');
    assert(
      !hasTowerA,
      `Parcel ${pid} does NOT contain Life Republic Tower A/B records`
    );
  }
});

// ── TEST SUITE 5: Building & Floor Data Integrity ───────────────────────────
console.log('\n[5] Testing Floors & Properties Linkages for All Parcels');
expectedParcelIds.forEach((pid) => {
  const parcelBuildings = MOCK_BUILDINGS.filter((b) => b.parcelId === pid);
  parcelBuildings.forEach((b) => {
    const floors = MOCK_FLOORS.filter((f) => f.buildingId === b.id);
    assert(
      floors.length > 0,
      `Building ${b.id} (${b.name}) has ${floors.length} floor records (configured: ${b.totalFloors})`
    );
  });
});

console.log('\n======================================================================');
console.log(`VERIFICATION SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('======================================================================\n');

if (passedTests === totalTests) {
  console.log('ALL PHASE 23 ACCEPTANCE CRITERIA SUCCESSFULLY VERIFIED!');
  process.exit(0);
} else {
  console.error('SOME PHASE 23 TESTS FAILED!');
  process.exit(1);
}
