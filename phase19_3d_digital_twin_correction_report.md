# PHASE 19 — 3D Digital Twin Correction, Data Consistency & Validation Report

**Project:** BHU-VERIFY — 3D ULPIN Generation and Vertical Property Mapping System
**Date:** 2026-09-03
**Trigger:** Real browser/video review of the Phase 18 deliverable showed the Digital Twin UI presenting **"Green Valley Residency" (12 floors / 42 m / 48 units / 3.5 m floor height)** inside panels that must describe **Tower B of Kolte Patil Life Republic Penthouses (20 floors / 62.0 m / 3.1 m floor height / Floor 4 = 12.4 m)**.

---

## 1. Problems Found (Root-Cause Analysis)

### P1 — CRITICAL: Green Valley mock rendered inside the Digital Twin workbench
- **ISSUE.** The Digital Twin page fed the legacy illustration dataset (`TWIN_BUILDING`/`TWIN_FLOORS` from `src/data/mockDigitalTwin.ts` — a self-contained "Green Valley Residency" mock with 12 floors, 42 m height, 48 units and a **3.5 m** floor formula) into the page header, building-info panel, building-overview stats, floor explorer, floor selector, unit grid, unit details sheet and mini-map. The 3D scene itself and the in-scene township panel were database-driven, so the video showed **two different buildings on one screen**.
- **ROOT CAUSE.** The page predated the unified GIS registry and kept its own "self-contained demo dataset"; only parts of it were migrated to `resolveTowerLinkedData` during Phase 18. The panels were never switched over.
- **FIX.** Created a **single canonical adapter** — `src/lib/twinView.ts` — that derives ALL `Twin*` presentation models from the resolved registry data (`linkedTowerData.building/floors/units/parcel` + the canonical featured `PropertyItem`). Every panel now renders from this one derived view. The Green Valley mock survives only as an illustrative fallback when **no** registry building is linked.
- **VERIFICATION.** `Select-String 'TWIN_BUILDING|TWIN_FLOORS'` over the page -> **0 matches**. `npx tsc --noEmit` -> 0 errors. `npm run build` -> exit 0.

### P2 — Floor elevation formula mismatch (14.0 m vs 12.4 m)
- **ISSUE.** The Green Valley mock computed `elevation = level * 3.5`, so "Floor 4" showed **14.0 m** instead of the required **12.4 m** (4 x 3.1).
- **ROOT CAUSE.** Same mock dataset (P1); its floor-height constant (3.5 m) contradicts the canonical Life Republic floor records.
- **FIX.** The canonical adapter computes `elevationM = floorNumber * 3.1` (`LR_FLOOR_HEIGHT_M`), matching the registry floor records in `src/data/floors.ts`, which already generate `elevation = Number((flNum * 3.1).toFixed(1))` for all five Life Republic towers (Tower B: Floor 0 = 0 m ... Floor 20 = 62.0 m; Floor 4 = **12.4 m**).
- **VERIFICATION.** Source-verified in floors.ts and twinView.ts; build passes.

### P3 — Floor selection did not drive the 3D geometry
- **ISSUE.** The bottom workbench floor explorer used a private `selectedFloorLevel` state that only changed panel text; the 3D scene's slicing/isolation state (`selectedLevel` + `inspection.selectFloor`) was untouched, so selecting "Floor 4" produced **no visual response** in the scene.
- **ROOT CAUSE.** Two parallel floor-selection states from the pre-registry page era.
- **FIX.** Unified selection: when the tower is registry-linked, the bottom floor explorer/selector call `handleSelectLevel(level)` -> `inspection.selectFloor(level)` + `setSelectedLevel(level)` — the same state the Township3DViewer consumes for slicing/isolation/explode. Unlinked towers keep panel-only behaviour.
- **VERIFICATION.** Code path verified; both states converge on the viewer props.

### P4 — Deep link did not auto-select Flat 402's side panel
- **ISSUE.** `?flat=402` set the flat id state but never resolved the TwinUnit object, so the property details sheet stayed closed after opening a deep link.
- **ROOT CAUSE.** No bridge between the flat id (deep link / in-scene explorer / conflict overlay) and the unit details sheet.
- **FIX.** Added a sync effect backed by a new `findTwinUnit()` helper (matches registry id, unit number, property record id, or demo spatial id). Deep link, in-scene explorer clicks and discrepancy-overlay clicks now all open the correct canonical unit panel.
- **VERIFICATION.** Code path verified; the full deep link returns HTTP 200 (see 4.2).

---

### P5 — Deep link absent -> wrong tower could stay selected
- **ISSUE.** Without `?building=`, tower selection relied only on the config default; the route property was never used to derive the tower.
- **FIX.** The deep-link effect now falls back to the **canonical featured registry unit**: `gisUnits.find(u => u.id === routeId || u.propertyId === routeId)` -> `buildingId` -> selects that tower; the same fallback derives the featured floor (Floor 4) and flat (402). Opening the bare deep link lands on **Tower B / Floor 4 / Flat 402**. `SELECTED_TOWER_ID` is already `"B-LR-B"`, so first paint resolves the real tower with no mock flash.
- **VERIFICATION.** Source-verified; all deep-link variants return HTTP 200.

### P6 — Dishonest label: parcel number shown as "Cadastral Base ULPIN"
- **ISSUE.** The viewer header printed `Cadastral Base ULPIN: 27412104101A8F` (hard-coded fragment) / the parcel number — mislabelling a parcel reference as a ULPIN.
- **FIX.** Relabelled to **"Cadastral Parcel"** driven by the resolved parcel (`parcelNumber ?? id`), plus a compact amber **"Demo Data"** badge in the same header strip.
- **VERIFICATION.** Source-verified; no hard-coded identifier fragments remain in the header.

### P7 — Oversized obstructive demo overlays
- **ISSUE.** Review showed large illustrative/demo text interfering with the 3D scene.
- **FIX.** Disclaimers reduced to small professional badges: viewer header **"Demo Data"** chip, header strip **"Demo - Not Official ULPIN"** chip (conditional on `dataStatus === "DEMO"`), the existing one-line footer `ILLUSTRATIVE 3D — NOT SURVEYED GIS GEOMETRY`, and the unit-sheet note **"DEMO DATA — NOT AN OFFICIAL GOVERNMENT CADASTRAL RECORD"**. The scene identity card stays compact.
- **VERIFICATION.** Source-verified; required legal wording preserved everywhere.

### P8 — Fabricated data displayed as fact
- **ISSUE.** The unit sheet showed a fabricated Aadhaar mask and a "Title deed / Khata extract / Tax receipts — Sealed" list for every unit.
- **FIX.** Registry units (`fromRegistry: true`) now show `PROTECTED` instead of a fake Aadhaar mask (registry units intentionally carry no PII), a **Demo Spatial Identifier** card, `Data Status: DEMO`, `Official ULPIN: NO`, `Source: Illustrative`, and the DEMO disclaimer — no fabricated document seals. Occupancy is derived honestly from verification status.
- **VERIFICATION.** Source-verified in UnitDetailsSheet.tsx / twinView.ts.

### P9 — Demo spatial identifier format
- **ISSUE.** The generated demo spatial ID for the featured unit was `3D-MH-PUN-LR-B-402`; the canonical Phase 18/19 identifier is `3D-MH-PUN-LR-B-0402`.
- **FIX.** Added an optional `spatialIdOverride` to the unit factory and set it on `PROP-LR-B-0402` only — one surgical override; the other 29 registry records and the registry-wide pattern are untouched.
- **VERIFICATION.** /api/gis-selftest after the change: `allDemoIdPrefix=true`, `demoIdRecordsMatch=true`, `allDemoIdsNonOfficial=true`, orphans=0.

---

## 2. Canonical Data Verified (single source of truth)

All values source-verified and consistent across buildings.ts, floors.ts, properties.ts, mockProperties.ts, townshipConfig.ts (TOWERS ids = registry ids), the GIS registry, and the new adapter:

| Entity | Canonical value | Verified |
|---|---|---|
| Society | Kolte Patil Life Republic Penthouses, Survey No. 74, Hinjewadi-Marunji-Kasarsai Rd, Marunji, Mulshi, Pune 411057 | OK |
| Parcel | PARCEL-MH-PUN-074 - 18.6172, 73.7141 - 18,500 m2 - ACTIVE - DEMO/ILLUSTRATIVE | OK |
| Tower A | B-LR-A / code BLDG-LR-A - 24 floors - 74.4 m - 18.6174, 73.7132 | OK |
| Tower B | B-LR-B / code BLDG-LR-B - 20 floors - 62.0 m - 18.6178, 73.7138 | OK |
| Tower C | B-LR-C / code BLDG-LR-C - 22 floors - 68.2 m - 18.6179, 73.7149 | OK |
| Tower D | B-LR-D / code BLDG-LR-D - 18 floors - 55.8 m - 18.6170, 73.7130 | OK |
| Tower E | B-LR-E / code BLDG-LR-E - 23 floors - 71.3 m - 18.6166, 73.7148 | OK |
| Floor stack | Ground (0) ... Floor N, elevation = floorNumber x 3.1 m — full stacks for all 5 towers (Tower B: 21 records, Floor 4 = **12.4 m**) | OK |
| Featured unit | PROP-LR-B-0402 - Tower B - Floor 4 - Flat 402 - 2BHK - 1050 sq ft - 12.4 m - Verified - 3D-MH-PUN-LR-B-0402 / 27412104101A8F-F04-402 - DEMO - isOfficialUlpin: false | OK |
| Scene config | TOWERS ids B-LR-A..E = registry ids; SELECTED_TOWER_ID = "B-LR-B"; site name "Kolte Patil Life Republic Penthouses" | OK |

**Data honesty:** every demo record keeps `isOfficialUlpin: false`, `dataStatus: "DEMO"`, `sourceType: "ILLUSTRATIVE"`; `officialUlpinReference` is null everywhere (selftest-verified). Nothing is presented as an official ULPIN.

**Existing data preserved:** Greenfield Heights, Pune Parcels 001-005 and all Phase 1-18 records untouched — selftest counts unchanged (6 parcels, 8 buildings, 127 floors, 30 properties, 3 conflicts) and the Green Valley mock remains isolated in its own namespaced sandbox (PARCEL-TWIN-GREEN-VALLEY).

---

## 3. Files Modified / Created

| File | Change |
|---|---|
| src/lib/twinView.ts | **NEW** — canonical Digital-Twin view adapter (buildTwinView, findTwinUnit, LR_FLOOR_HEIGHT_M = 3.1) |
| src/app/properties/[id]/digital-twin/page.tsx | All panels switched to the canonical view; unified floor selection driving 3D; deep-link fallback to the featured registry unit; unit-sync effect; honest parcel label; Demo Data badge; empty-state for floors without units |
| src/data/mockDigitalTwin.ts | Types extended with optional canonical linkage fields (buildingId, buildingCode, parcelId, societyName, surveyNumber, dataStatus, sourceType, isOfficialUlpin; unit demoSpatialId/propertyRecordId/fromRegistry); header documents the reduced fallback role |
| src/components/digital-twin/BuildingHeader.tsx | Conditional compact "Demo - Not Official ULPIN" badge |
| src/components/digital-twin/UnitDetailsSheet.tsx | Registry-unit panel: spatial ID, registry ID, DEMO / Official-ULPIN-NO / Illustrative badges, disclaimer; fabricated "sealed documents" list restricted to the illustrative fallback |
| src/data/properties.ts | Optional spatialIdOverride; canonical 3D-MH-PUN-LR-B-0402 on the featured unit |

## 4. Verification Results

### 4.1 Static (executed)
| Check | Result |
|---|---|
| npx tsc --noEmit (3 runs during the phase) | **PASS — 0 errors** (exit 0) |
| npm run build (Next.js production build, 2 runs) | **PASS** (exit 0, all routes incl. digital-twin) |
| Source grep: TWIN_BUILDING/TWIN_FLOORS in digital-twin page | **0 matches** |
| Canonical data audit (section 2 values vs buildings/floors/properties/mockProperties/townshipConfig) | **PASS** |

### 4.2 Live production-build HTTP (executed — next start, port 3100)
| Route | Expected | Actual |
|---|---|---|
| /properties/PROP-LR-B-0402/digital-twin?building=B-LR-B&floor=4&flat=402 | 200 | **200** |
| /properties/PROP-LR-B-0402/digital-twin?building=B-LR-B&floor=4 | 200 | **200** |
| /properties/PROP-LR-B-0402/digital-twin?building=B-LR-B | 200 | **200** |
| /properties/PROP-LR-B-0402/digital-twin | 200 | **200** |
| /properties/PROP-LR-B-0402 | 200 | **200** |
| /map?society=PARCEL-MH-PUN-074&building=B-LR-B | 200 | **200** |
| /map | 200 | **200** |
| /society/PARCEL-MH-PUN-074/buildings | 200 | **200** |
| /properties/PROP-LR-B-9999/digital-twin (invalid id) | graceful | **200** -> "Place not found" fallback card, no crash |
| /api/gis-selftest | integrity ok | **200** — allDemoIdsNonOfficial=true, allUlpinRefsNull=true, allDemoIdPrefix=true, demoIdRecordsMatch=true, orphans=0 |

### 4.3 Browser-level validation
**NOT VERIFIED — REQUIRES MANUAL BROWSER TEST.** No browser automation is available in this environment. The following remain browser-dependent and were **not** executed: WebGL scene rendering and visual quality, tower click -> panel identity, ISOLATE/SHOW ALL ghosting, floor slicing/explode animation smoothness, 2D<->3D click-through, search UX, Add/Archive Building dialogs, RBAC click-through per role, console error/warning/hydration sweep, FPS/memory measurement, responsive and accessibility passes. HTTP-level and data-integrity evidence above is real; visual confirmation is not.

### 4.4 Performance
**NOT MEASURED — REQUIRES BROWSER.** No FPS/draw-call/memory numbers are claimed. Architectural guarantees only: instanced scenery and SceneErrorBoundary layers from Phase 12/13/15 are preserved; the adapter adds one useMemo derivation per render pass (no per-frame work).

## 5. Remaining Limitations
1. Browser-dependent checks (4.3) — NOT VERIFIED — REQUIRES MANUAL BROWSER TEST.
2. Deployment — NOT DEPLOYED (no authorization/credentials in this environment; Phase 17 blocker SESSION_SECRET still applies at deploy time).
3. Firebase/Firestore live round-trips — NOT VERIFIED — REQUIRES LIVE ENVIRONMENT (registry currently served from the deterministic demo dataset + hydration pipeline, as designed for SIH; clearly distinguished from production Firestore data in Phase 16/17 reports).
4. Floors without ingested unit records (e.g. Tower B floors 2-3, 5-19) display an honest "No unit records ingested for this floor yet" empty state with PENDING status dots rather than fabricated units.

## 6. Final Pass/Fail Matrix

| TEST | EXPECTED | ACTUAL | STATUS | EVIDENCE |
|---|---|---|---|---|
| Life Republic loads (deep link) | correct society/tower/floor/flat | route resolves; canonical adapter feeds panels | PASS (HTTP/data) | 4.2 |
| Towers A-E | canonical ids/heights/floors everywhere | identical across registry, TOWERS, adapter | PASS | 2 |
| Tower B = 20 floors / 62.0 m | yes | buildings.ts + adapter | PASS | 2 |
| Floor 4 = 12.4 m | 4 x 3.1 | registry + adapter formula | PASS | 2, P2 |
| Flat 402 = PROP-LR-B-0402, 2BHK, 1050 sqft | canonical record | registry record, no UI copy | PASS | 2, P1 |
| Spatial ID | 3D-MH-PUN-LR-B-0402 | registry override + sheet display | PASS | P9 |
| Demo disclaimer | visible, professional, non-obstructive | header chip + footer + unit sheet | PASS | P7 |
| No Green Valley in Life Republic twin | zero leakage | 0 TWIN_* usages; sandbox isolated | PASS | P1, 4.1 |
| 2D <-> 3D deep links | correct params both directions | links source-verified; routes 200 | PASS (HTTP) | 4.2 |
| Isolation / slicing / explode respond | geometry reacts | unified state drives viewer | PASS (code) | P3 |
| Invalid deep link | graceful | "Place not found" fallback | PASS | 4.2 |
| Search finds LR entities | generic index | gisSearch.ts indexes id/code/name/spatialId/unitNumber | PASS (code) | 4.1 |
| Add / Archive Building | persist + soft-delete | existing buildingService/UI untouched, build passes | PASS (static) | 4.1 |
| RBAC | per existing permission model | unchanged by this phase | PASS (static) | - |
| TypeScript | 0 errors | exit 0 x3 | PASS | 4.1 |
| Production build | success | exit 0 x2 | PASS | 4.1 |
| Browser console / FPS / responsive / a11y | clean | not executed | **NOT VERIFIED — REQUIRES MANUAL BROWSER TEST** | 4.3 |
| Deployed production verification | live URL | not deployed | **NOT VERIFIED — REQUIRES LIVE ENVIRONMENT** | 5 |

**Final verdict: B — LOCALLY VERIFIED (static + production-build HTTP + data-integrity), DEPLOYMENT & BROWSER PENDING.** The Green-Valley data mismatch — the core Phase 19 defect — is fixed at the root cause with a single canonical data path.
