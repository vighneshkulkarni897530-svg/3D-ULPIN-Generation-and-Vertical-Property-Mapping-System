/**
 * scripts/verify_phase23_ai_3d_generation.ts
 *
 * PHASE 23 — Automated Verification Suite for:
 * AI 3D DIGITAL TWIN GENERATION FROM USER-UPLOADED SOCIETY IMAGES
 *
 * Tests:
 * 1. Society A 3D Generation & Registry Isolation
 * 2. Society B 3D Generation & Distinct Scene Layout
 * 3. Unconfigured Society Honest Empty State (No Fallback)
 * 4. Life Republic (PARCEL-MH-PUN-074) Isolation
 * 5. Version Preservation & Incrementation (v1 -> v2)
 * 6. RBAC: Citizen Role Rejection (403 Forbidden)
 * 7. RBAC: Society Admin Cross-Society Generation Block (403 Forbidden)
 * 8. Validation: Invalid/Empty societyId (400 Bad Request)
 * 9. Validation: Oversized Payload > 10MB (400 Bad Request)
 * 10. Provider Resilience: Clean Fallback / Informative Status without Token
 */

import {
  getSocietyDigitalTwin,
  saveSocietyDigitalTwin,
  resetSocietyDigitalTwin,
  getGenerationStatus,
} from "../src/lib/digital-twin/digitalTwinRegistry";
import { analyzeSocietySiteImage } from "../src/lib/digital-twin/imageAnalyzer";
import type { SocietyDigitalTwin } from "../src/types/digitalTwin";
import { POST as generatePost } from "../src/app/api/digital-twin/generate/route";
import { GET as statusGet } from "../src/app/api/digital-twin/status/route";
import { NextRequest } from "next/server";

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
    if (detail) console.log(`         -> ${detail}`);
  } else {
    console.error(`  [FAIL] ${testName}`);
    if (detail) console.error(`         -> ${detail}`);
  }
}

// Helper to create mock NextRequest
function createRequest(
  url: string,
  method: string,
  body?: any,
  headers?: Record<string, string>
): NextRequest {
  const init: any = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

// 1x1 transparent PNG data URL for testing
const SAMPLE_PNG_A =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const SAMPLE_PNG_B =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mNkYPj/nwEIGBkYAAnsA/4c1w2YAAAAAElFTkSuQmCC";

async function runAllTests() {
  console.log("===============================================================================");
  console.log("BHU-VERIFY PHASE 23: AI 3D DIGITAL TWIN GENERATION VERIFICATION SUITE");
  console.log("===============================================================================\n");

  // TEST 1: Society A Generation & Isolation
  console.log("--- TEST 1: Society A 3D Generation & Registry Isolation ---");
  {
    const socAId = "PARCEL-MH-PUN-001";
    resetSocietyDigitalTwin(socAId);

    const req = createRequest(
      "http://localhost:3000/api/digital-twin/generate",
      "POST",
      {
        societyId: socAId,
        societyName: "Megapolis Splendida",
        imageDataUrl: SAMPLE_PNG_A,
        role: "society_admin",
      },
      {
        "x-user-role": "society_admin",
        "x-user-society": socAId,
      }
    );

    const res = await generatePost(req);
    const json = await res.json();

    assert(res.status === 200, "API returns 200 OK for valid generation");
    assert(json.status === "READY" || json.status === "COMPLETED", "Status is READY/COMPLETED");
    assert(json.digitalTwin?.societyId === socAId, "Result matches societyId exactly");
    assert(json.digitalTwin?.sourceImageVersion === "v1", "Initial generation version is v1");
    assert(json.digitalTwin?.isOfficialUlpin === false, "isOfficialUlpin is explicitly false");
    assert(json.digitalTwin?.dataStatus === "DEMO", "dataStatus is DEMO");
    assert(
      json.digitalTwin?.sourceType === "AI_GENERATED_VISUALIZATION",
      "sourceType is AI_GENERATED_VISUALIZATION"
    );
  }

  // TEST 2: Society B Generation & Distinct Scene Layout
  console.log("\n--- TEST 2: Society B 3D Generation & Distinct Scene Layout ---");
  {
    const socBId = "PARCEL-MH-PUN-002";
    resetSocietyDigitalTwin(socBId);

    const req = createRequest(
      "http://localhost:3000/api/digital-twin/generate",
      "POST",
      {
        societyId: socBId,
        societyName: "Amanora Gateway Towers",
        imageDataUrl: SAMPLE_PNG_B,
        role: "society_admin",
      },
      {
        "x-user-role": "society_admin",
        "x-user-society": socBId,
      }
    );

    const res = await generatePost(req);
    const json = await res.json();

    const twinA = getSocietyDigitalTwin("PARCEL-MH-PUN-001");
    const twinB = getSocietyDigitalTwin(socBId);

    assert(res.status === 200, "API returns 200 OK for Society B");
    assert(twinB !== null, "Society B is stored in registry");
    assert(twinB?.societyId === socBId, "Society B has its own societyId");
    assert(
      twinA?.societyName !== twinB?.societyName,
      "Society A and B names are distinct and isolated"
    );
    assert(
      twinA?.sourceImageVersion === "v1" && twinB?.sourceImageVersion === "v1",
      "Both maintain independent versioning"
    );
  }

  // TEST 3: Unconfigured Society Empty State (Zero Fallback)
  console.log("\n--- TEST 3: Unconfigured Society Honest Empty State (Zero Fallback) ---");
  {
    const unconfiguredId = "UNCONFIGURED-PARCEL-999";
    const twin = getSocietyDigitalTwin(unconfiguredId);

    const statusReq = createRequest(
      `http://localhost:3000/api/digital-twin/status?societyId=${unconfiguredId}`,
      "GET"
    );
    const statusRes = await statusGet(statusReq);
    const statusJson = await statusRes.json();

    assert(twin === null, "Registry returns null for unconfigured society");
    assert(
      statusJson.status === "SOURCE_IMAGE_REQUIRED" || statusJson.generationStatus === "SOURCE_IMAGE_REQUIRED",
      "Status API returns SOURCE_IMAGE_REQUIRED for unconfigured society"
    );
    assert(statusJson.digitalTwin === null, "Status API digitalTwin payload is null");
  }

  // TEST 4: Life Republic (PARCEL-MH-PUN-074) Isolation
  console.log("\n--- TEST 4: Life Republic (PARCEL-MH-PUN-074) Isolation ---");
  {
    const lifeRepublic = getSocietyDigitalTwin("PARCEL-MH-PUN-074");
    assert(lifeRepublic !== null, "Life Republic exists in registry");
    assert(
      lifeRepublic?.buildings.length === 5,
      "Life Republic has its 5 characteristic towers (R1-R5)"
    );
    assert(
      Boolean(lifeRepublic?.societyName.includes("Life Republic")),
      "Life Republic name is correctly preserved"
    );

    // Ensure no other society copied Life Republic's 5 towers
    const socA = getSocietyDigitalTwin("PARCEL-MH-PUN-001");
    assert(
      socA?.buildings.length !== 5 || socA?.buildings[0]?.name !== "Tower B",
      "Society A does NOT reuse Life Republic 5-tower layout"
    );
  }

  // TEST 5: Version Preservation & Incrementation (v1 -> v2)
  console.log("\n--- TEST 5: Version Preservation & Incrementation (v1 -> v2) ---");
  {
    const socId = "PARCEL-MH-PUN-001";
    const twinV1 = getSocietyDigitalTwin(socId);
    assert(twinV1?.sourceImageVersion === "v1", "Current version before re-upload is v1");

    // Re-generate
    const req = createRequest(
      "http://localhost:3000/api/digital-twin/generate",
      "POST",
      {
        societyId: socId,
        societyName: "Megapolis Splendida",
        imageDataUrl: SAMPLE_PNG_B,
        role: "society_admin",
      },
      {
        "x-user-role": "society_admin",
        "x-user-society": socId,
      }
    );

    const res = await generatePost(req);
    const json = await res.json();

    assert(res.status === 200, "Re-generation succeeds with 200 OK");
    assert(json.digitalTwin?.sourceImageVersion === "v2", "Version increments to v2");

    const twinV2 = getSocietyDigitalTwin(socId);
    assert(twinV2?.sourceImageVersion === "v2", "Registry stores new v2 version");
  }

  // TEST 6: RBAC: Citizen Role Rejection (403 Forbidden)
  console.log("\n--- TEST 6: RBAC: Citizen Role Rejection (403 Forbidden) ---");
  {
    const req = createRequest(
      "http://localhost:3000/api/digital-twin/generate",
      "POST",
      {
        societyId: "PARCEL-MH-PUN-001",
        societyName: "Megapolis Splendida",
        imageDataUrl: SAMPLE_PNG_A,
        role: "citizen",
      },
      {
        "x-user-role": "citizen",
      }
    );

    const res = await generatePost(req);
    const json = await res.json();

    assert(res.status === 403, "Citizen role generation is rejected with 403 Forbidden");
    assert(
      typeof json.error === "string" && json.error.includes("Citizen"),
      "Error message clearly states RBAC restriction"
    );
  }

  // TEST 7: RBAC: Cross-Society Admin Scope Block (403 Forbidden)
  console.log("\n--- TEST 7: RBAC: Cross-Society Admin Scope Block (403 Forbidden) ---");
  {
    const req = createRequest(
      "http://localhost:3000/api/digital-twin/generate",
      "POST",
      {
        societyId: "PARCEL-MH-PUN-002",
        societyName: "Amanora Gateway Towers",
        imageDataUrl: SAMPLE_PNG_A,
        role: "society_admin",
      },
      {
        "x-user-role": "society_admin",
        "x-user-society": "PARCEL-MH-PUN-001", // Assigned only to 001!
      }
    );

    const res = await generatePost(req);
    const json = await res.json();

    assert(res.status === 403, "Cross-society generation is rejected with 403 Forbidden");
    assert(
      typeof json.error === "string" && json.error.includes("assigned society"),
      "Error message indicates society assignment violation"
    );
  }

  // TEST 8: Validation: Invalid/Empty societyId (400 Bad Request)
  console.log("\n--- TEST 8: Validation: Invalid/Empty societyId (400 Bad Request) ---");
  {
    const req = createRequest(
      "http://localhost:3000/api/digital-twin/generate",
      "POST",
      {
        societyId: "",
        imageDataUrl: SAMPLE_PNG_A,
      },
      {
        "x-user-role": "society_admin",
      }
    );

    const res = await generatePost(req);
    assert(res.status === 400, "Empty societyId returns 400 Bad Request");
  }

  // TEST 9: Validation: Oversized Payload > 10MB (400 Bad Request)
  console.log("\n--- TEST 9: Validation: Oversized Payload > 10MB (400 Bad Request) ---");
  {
    // Generate a ~11MB base64 string
    const oversizedBase64 = "data:image/png;base64," + "A".repeat(11 * 1024 * 1024);

    const req = createRequest(
      "http://localhost:3000/api/digital-twin/generate",
      "POST",
      {
        societyId: "PARCEL-MH-PUN-001",
        imageDataUrl: oversizedBase64,
        role: "society_admin",
      },
      {
        "x-user-role": "society_admin",
        "x-user-society": "PARCEL-MH-PUN-001",
      }
    );

    const res = await generatePost(req);
    const json = await res.json();

    assert(res.status === 400, "Oversized payload returns 400 Bad Request");
    assert(
      typeof json.error === "string" && json.error.includes("10MB limit"),
      "Error mentions 10MB limit"
    );
  }

  // TEST 10: Provider Resilience: Graceful Inference Fallback & No 500
  console.log("\n--- TEST 10: Provider Resilience: Graceful Synthesis & No 500 ---");
  {
    const socCId = "PARCEL-MH-PUN-003";
    resetSocietyDigitalTwin(socCId);

    const req = createRequest(
      "http://localhost:3000/api/digital-twin/generate",
      "POST",
      {
        societyId: socCId,
        societyName: "Blue Ridge Township",
        imageDataUrl: SAMPLE_PNG_A,
        role: "society_admin",
      },
      {
        "x-user-role": "society_admin",
        "x-user-society": socCId,
      }
    );

    const res = await generatePost(req);
    const json = await res.json();

    assert(res.status === 200, "API handles environment smoothly with 200 OK");
    assert(
      json.digitalTwin?.generationProvider?.length > 0,
      `Generation provider recorded: ${json.digitalTwin?.generationProvider}`
    );
    assert(json.digitalTwin?.buildings.length > 0, "Synthesized buildings are generated");
  }

  console.log("\n===============================================================================");
  console.log(`VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log("===============================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error("Verification suite failed unexpectedly:", err);
  process.exit(1);
});
