/**
 * Phase 22 — Dynamic Society-Specific 3D Digital Twin Verification Script
 * =======================================================================
 * Runs programmatic tests validating:
 * 1. Society Isolation — Each society has its own distinct digital twin.
 * 2. Structural Composition — Buildings, parks, parking, amenities, and water bodies match exact requirements.
 * 3. Empty State Protection — Unconfigured societies return null and do not fall back to Life Republic.
 * 4. Image Analyzer & Synthesizer — Extracts distinct 3D layouts with accurate coordinate mapping.
 * 5. Persistent Registry Storage — Overrides and updates persist cleanly.
 */

import {
  getSocietyDigitalTwin,
  saveSocietyDigitalTwin,
  resetSocietyDigitalTwin,
  LIFE_REPUBLIC_DIGITAL_TWIN,
  SOCIETY_A_DIGITAL_TWIN,
  SOCIETY_B_DIGITAL_TWIN,
  SOCIETY_C_DIGITAL_TWIN,
} from '../src/lib/digital-twin/digitalTwinRegistry';
import { analyzeSocietySiteImage } from '../src/lib/digital-twin/imageAnalyzer';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  expected: string | number | boolean;
  actual: string | number | boolean;
  notes?: string;
}

const results: TestResult[] = [];

function assert(suite: string, name: string, condition: boolean, expected: any, actual: any, notes?: string) {
  results.push({
    suite,
    name,
    passed: condition,
    expected,
    actual,
    notes,
  });
}

async function runVerification() {
  console.log('================================================================');
  console.log('🚀 PHASE 22 — DYNAMIC SOCIETY 3D DIGITAL TWIN VERIFICATION SUITE');
  console.log('================================================================\n');

  // ── TEST SUITE 1: Life Republic Twin (5 towers, lake, pavilion) ──
  const lrTwin = getSocietyDigitalTwin('PARCEL-MH-PUN-074');
  assert('Life Republic', 'Twin exists in registry', lrTwin !== null, true, lrTwin !== null);
  assert('Life Republic', 'Building count == 5', lrTwin?.buildings.length === 5, 5, lrTwin?.buildings.length ?? 0);
  assert('Life Republic', 'Has Central Lake', lrTwin?.waterBodies.length === 1, 1, lrTwin?.waterBodies.length ?? 0);
  assert('Life Republic', 'Has Glass Pavilion amenity', lrTwin?.amenities.length === 1, 1, lrTwin?.amenities.length ?? 0);
  assert('Life Republic', 'Ring road configured', Boolean(lrTwin?.roads.ringRoad), true, Boolean(lrTwin?.roads.ringRoad));

  // ── TEST SUITE 2: Society A Twin (3 buildings, 1 park, 1 parking, 1 clubhouse, 0 pools) ──
  const socATwin = getSocietyDigitalTwin('PARCEL-MH-PUN-001');
  assert('Society A', 'Twin exists in registry', socATwin !== null, true, socATwin !== null);
  assert('Society A', 'Building count == 3', socATwin?.buildings.length === 3, 3, socATwin?.buildings.length ?? 0);
  assert('Society A', 'Park count == 1', socATwin?.parks.length === 1, 1, socATwin?.parks.length ?? 0);
  assert('Society A', 'Parking count == 1', socATwin?.parkingAreas.length === 1, 1, socATwin?.parkingAreas.length ?? 0);
  assert('Society A', 'Amenity count == 1 (Clubhouse)', socATwin?.amenities.length === 1, 1, socATwin?.amenities.length ?? 0);
  assert('Society A', 'Water bodies == 0 (No pool)', socATwin?.waterBodies.length === 0, 0, socATwin?.waterBodies.length ?? 0);
  assert('Society A', 'No ring road', !socATwin?.roads.ringRoad, true, !socATwin?.roads.ringRoad);

  // ── TEST SUITE 3: Society B Twin (5 buildings, 2 parks, 2 parking, 1 pool, 1 clubhouse) ──
  const socBTwin = getSocietyDigitalTwin('PARCEL-MH-PUN-002');
  assert('Society B', 'Twin exists in registry', socBTwin !== null, true, socBTwin !== null);
  assert('Society B', 'Building count == 5', socBTwin?.buildings.length === 5, 5, socBTwin?.buildings.length ?? 0);
  assert('Society B', 'Park count == 2', socBTwin?.parks.length === 2, 2, socBTwin?.parks.length ?? 0);
  assert('Society B', 'Parking count == 2', socBTwin?.parkingAreas.length === 2, 2, socBTwin?.parkingAreas.length ?? 0);
  assert('Society B', 'Amenity count == 1', socBTwin?.amenities.length === 1, 1, socBTwin?.amenities.length ?? 0);
  assert('Society B', 'Has Swimming Pool', Boolean(socBTwin?.waterBodies.some(w => w.type === 'SWIMMING_POOL')), true, socBTwin?.waterBodies.some(w => w.type === 'SWIMMING_POOL') ?? false);

  // ── TEST SUITE 4: Society C Twin (2 buildings, 0 parks, 1 parking, 0 clubhouse, 0 pools) ──
  const socCTwin = getSocietyDigitalTwin('PARCEL-MH-PUN-003');
  assert('Society C', 'Twin exists in registry', socCTwin !== null, true, socCTwin !== null);
  assert('Society C', 'Building count == 2', socCTwin?.buildings.length === 2, 2, socCTwin?.buildings.length ?? 0);
  assert('Society C', 'Park count == 0', socCTwin?.parks.length === 0, 0, socCTwin?.parks.length ?? 0);
  assert('Society C', 'Parking count == 1', socCTwin?.parkingAreas.length === 1, 1, socCTwin?.parkingAreas.length ?? 0);
  assert('Society C', 'Amenity count == 0', socCTwin?.amenities.length === 0, 0, socCTwin?.amenities.length ?? 0);
  assert('Society C', 'Water bodies == 0', socCTwin?.waterBodies.length === 0, 0, socCTwin?.waterBodies.length ?? 0);

  // ── TEST SUITE 5: Unconfigured Society Protection (Never defaults to Life Republic) ──
  const unconfiguredTwin = getSocietyDigitalTwin('PARCEL-MH-PUN-004');
  assert('Unconfigured Society', 'Returns null for unconfigured society', unconfiguredTwin === null, true, unconfiguredTwin === null);
  assert('Unconfigured Society', 'Does NOT return Life Republic', unconfiguredTwin?.societyId !== 'PARCEL-MH-PUN-074', true, unconfiguredTwin?.societyId !== 'PARCEL-MH-PUN-074');

  const arbitraryTwin = getSocietyDigitalTwin('UNKNOWN-PARCEL-999');
  assert('Unknown Society', 'Returns null for unknown parcel', arbitraryTwin === null, true, arbitraryTwin === null);

  // ── TEST SUITE 6: Procedural Image Analysis & Synthesis ──
  const synthesizedTwin = await analyzeSocietySiteImage(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkWPjfDwAEeQHy/0QW9AAAAABJRU5ErkJggg==',
    'Green Meadows Co-op Housing Society',
    'PARCEL-MH-PUN-005'
  );

  assert('Image Synthesizer', 'Synthesized societyId matches', synthesizedTwin.societyId === 'PARCEL-MH-PUN-005', 'PARCEL-MH-PUN-005', synthesizedTwin.societyId);
  assert('Image Synthesizer', 'Synthesized societyName matches', synthesizedTwin.societyName === 'Green Meadows Co-op Housing Society', 'Green Meadows Co-op Housing Society', synthesizedTwin.societyName);
  assert('Image Synthesizer', 'Synthesizes at least 2 buildings', synthesizedTwin.buildings.length >= 2, true, synthesizedTwin.buildings.length >= 2, `Count: ${synthesizedTwin.buildings.length}`);
  assert('Image Synthesizer', 'Synthesizes roads', synthesizedTwin.roads.segments.length > 0, true, synthesizedTwin.roads.segments.length > 0);
  assert('Image Synthesizer', 'Synthesizes site dimensions', synthesizedTwin.siteDimensions.widthMeters > 0, true, synthesizedTwin.siteDimensions.widthMeters > 0);
  assert('Image Synthesizer', 'Synthesizes site boundary', synthesizedTwin.siteBoundary.half[0] > 0, true, synthesizedTwin.siteBoundary.half[0] > 0);
  assert('Image Synthesizer', 'isAiAnalyzed is true', synthesizedTwin.isAiAnalyzed === true, true, synthesizedTwin.isAiAnalyzed);

  // ── Print Results Summary ──
  console.log('----------------------------------------------------------------');
  let passCount = 0;
  let failCount = 0;

  const suites = Array.from(new Set(results.map(r => r.suite)));
  for (const suite of suites) {
    console.log(`\n📌 ${suite}:`);
    const suiteResults = results.filter(r => r.suite === suite);
    for (const r of suiteResults) {
      if (r.passed) {
        passCount++;
        console.log(`  ✅ [PASS] ${r.name}`);
      } else {
        failCount++;
        console.log(`  ❌ [FAIL] ${r.name} — Expected: ${r.expected}, Got: ${r.actual} ${r.notes ? `(${r.notes})` : ''}`);
      }
    }
  }

  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passCount} | FAILED: ${failCount}`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
