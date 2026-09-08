/**
 * Phase 23 Verification Script — Society 3D ULPIN Gateway & Cadastral Isolation
 * ==============================================================================
 * Tests the Society 3D ULPIN registry, zero fallbacks, deep linking security,
 * and search resolution.
 */

import {
  SOCIETY_3D_ULPIN_RECORDS,
  resolveSocietyBy3DUlpin,
  resolveSocietyByAnyId,
  validateSocietyBuildingOwnership,
  getAllSociety3DUlpins,
} from '../src/lib/society/society3DUlpinRegistry';
import { searchGisRegistry } from '../src/lib/gisSearch';
import { MOCK_PARCELS } from '../src/data/parcels';
import { MOCK_BUILDINGS } from '../src/data/buildings';
import { MOCK_FLOORS } from '../src/data/floors';
import { MOCK_PROPERTIES } from '../src/data/properties';
import { getSocietyDigitalTwin } from '../src/lib/digital-twin/digitalTwinRegistry';

function runVerification() {
  console.log('================================================================');
  console.log('PHASE 23 VERIFICATION: Society 3D ULPIN Gateway & Data Isolation');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      failed++;
    }
  }

  // 1. Registry Integrity & Legal Disclaimers
  console.log('--- 1. Society 3D ULPIN Registry & Legal Disclaimers ---');
  const allUlpins = getAllSociety3DUlpins();
  assert(allUlpins.length === 8, `Registry has 8 society records (Found ${allUlpins.length})`);

  for (const s of allUlpins) {
    assert(s.isOfficialUlpin === false, `${s.society3DUlpin}: isOfficialUlpin is FALSE (Legal standard compliance)`);
    assert(s.dataStatus === 'DEMO', `${s.society3DUlpin}: dataStatus is "DEMO"`);
    assert(s.sourceType === 'ILLUSTRATIVE', `${s.society3DUlpin}: sourceType is "ILLUSTRATIVE"`);
    assert(s.society3DUlpin.startsWith('S3D-MH-PUN-'), `${s.society3DUlpin}: Follows S3D-MH-PUN format`);
  }

  // 2. Society Resolution Functions
  console.log('\n--- 2. Society 3D ULPIN Resolution Functions ---');
  const gvrByUlpin = resolveSocietyBy3DUlpin('S3D-MH-PUN-GVR-001');
  assert(gvrByUlpin?.societyName === 'Green View Residency', 'resolveSocietyBy3DUlpin resolves Green View Residency');

  const skaByLowerUlpin = resolveSocietyBy3DUlpin('s3d-mh-pun-ska-001');
  assert(skaByLowerUlpin?.societyName === 'Shree Krishna Arcade', 'resolveSocietyBy3DUlpin handles lower-case');

  const lrByAny = resolveSocietyByAnyId('PARCEL-MH-PUN-074');
  assert(lrByAny?.society3DUlpin === 'S3D-MH-PUN-LR-001', 'resolveSocietyByAnyId resolves by parcelId');

  const amaByBldg = resolveSocietyByAnyId('B-601');
  assert(amaByBldg?.society3DUlpin === 'S3D-MH-PUN-AMA-001', 'resolveSocietyByAnyId resolves by buildingId B-601');

  const invalidUlpin = resolveSocietyBy3DUlpin('S3D-UNKNOWN-999');
  assert(invalidUlpin === null, 'resolveSocietyBy3DUlpin safely returns null for invalid ULPIN');

  // 3. Cross-Society Building Ownership Validation (Deep Link Security)
  console.log('\n--- 3. Deep Link Security (Building Ownership Validation) ---');
  assert(
    validateSocietyBuildingOwnership('PARCEL-MH-PUN-001', 'B-102') === true,
    'B-102 valid for Green View Residency',
  );
  assert(
    validateSocietyBuildingOwnership('PARCEL-MH-PUN-074', 'B-LR-A') === true,
    'B-LR-A valid for Life Republic',
  );
  assert(
    validateSocietyBuildingOwnership('PARCEL-MH-PUN-001', 'B-LR-A') === false,
    'B-LR-A rejected for Green View Residency (Cross-society tampering blocked)',
  );
  assert(
    validateSocietyBuildingOwnership('PARCEL-MH-PUN-002', 'B-501') === false,
    'B-501 rejected for Shree Krishna Arcade (Cross-society tampering blocked)',
  );

  // 4. Strict Data Isolation (Zero Fallbacks)
  console.log('\n--- 4. Strict Data Isolation & Zero Fallback Checks ---');
  const configuredSocieties = [
    'PARCEL-MH-PUN-001',
    'PARCEL-MH-PUN-002',
    'PARCEL-MH-PUN-003',
    'PARCEL-MH-PUN-004',
    'PARCEL-MH-PUN-005',
    'PARCEL-MH-PUN-006',
    'PARCEL-MH-PUN-074',
  ];

  const buildingCounts = new Map<string, number>();
  const imageNames = new Set<string>();

  for (const socId of configuredSocieties) {
    const twin = getSocietyDigitalTwin(socId);
    assert(twin !== null, `${socId}: Has dedicated digital twin data`);
    if (twin) {
      assert(twin.societyId === socId, `${socId}: Twin societyId strictly matches`);
      assert(twin.buildings.length > 0, `${socId}: Has ${twin.buildings.length} custom buildings`);
      buildingCounts.set(socId, twin.buildings.length);
      if (twin.sourceImage) imageNames.add(twin.sourceImage);
    }
  }

  assert(imageNames.size >= 7, `All 7 societies have distinct source site images (Found ${imageNames.size})`);
  
  // Unconfigured Society Empty State
  const unconfiguredTwin = getSocietyDigitalTwin('society-unconfigured-test');
  assert(unconfiguredTwin === null, 'Unconfigured society returns null (does not silently load Life Republic)');
  
  const unconfiguredRecord = resolveSocietyBy3DUlpin('S3D-MH-PUN-UNC-999');
  assert(
    unconfiguredRecord?.digitalTwinStatus === 'SOURCE_IMAGE_REQUIRED',
    'Unconfigured society status is "SOURCE_IMAGE_REQUIRED" (Honest empty state)',
  );

  // 5. Global Search Indexing of Society 3D ULPINs
  console.log('\n--- 5. Global GIS Search Indexing ---');
  const gvrSearch = searchGisRegistry(MOCK_PARCELS, MOCK_BUILDINGS, MOCK_FLOORS, MOCK_PROPERTIES, 'S3D-MH-PUN-GVR-001');
  assert(
    gvrSearch.parcels.some((p) => p.id === 'PARCEL-MH-PUN-001'),
    'Search for S3D-MH-PUN-GVR-001 returns Green View parcel',
  );

  const hinSearch = searchGisRegistry(MOCK_PARCELS, MOCK_BUILDINGS, MOCK_FLOORS, MOCK_PROPERTIES, 'S3D-MH-PUN-HIN-001');
  assert(
    hinSearch.parcels.some((p) => p.id === 'PARCEL-MH-PUN-005'),
    'Search for S3D-MH-PUN-HIN-001 returns Hinjewadi parcel',
  );

  console.log('\n================================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification();
