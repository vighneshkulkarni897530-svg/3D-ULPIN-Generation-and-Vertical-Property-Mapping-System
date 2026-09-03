# Phase 16 — Production Environment Verification Report

**Project:** BHU-VERIFY — 3D ULPIN Generation and Vertical Property Mapping System
**Date:** 2026-09-03
**Verification ladder used throughout this report:**

| Label | Meaning |
|---|---|
| LOCAL LIVE HTTP VERIFIED | Tested against a running **production build** (`next start`) of current code on localhost — real HTTP, real server logic |
| REAL FIREBASE VERIFIED | Tested against the real Firebase project with real accounts |
| DEPLOYED RULES VERIFIED | Tested against rules deployed to the Firebase project |
| BROWSER VERIFIED | Tested in a real browser session |
| NOT VERIFIED — REQUIRES LIVE PRODUCTION ENVIRONMENT | Could not be tested here; no claim made |

**Headline:** the deployment target (Firebase Hosting `ulpin-3d`) exists in config but is **not deployed** (both candidate URLs → 404). All verification in this phase is therefore **LOCAL LIVE HTTP VERIFIED against a fresh production build**; every item needing a live deployment, real accounts, a browser, or Vercel/Firebase console access is explicitly marked.

---

## 1. Production Environment Audit

- Runtime: Next.js **16.3.3**, React 19, `next.config.js` (strict mode, `transpilePackages:['three']`), no `vercel.json` — **deployment target is Firebase Hosting** (`firebase.json`: hosting site `ulpin-3d`, frameworksBackend us-central1, firestore+storage rules wired).
- Git: branch `main`; working tree carries Phase 15 fixes (7 modified files) + this phase's changes; remote = GitHub origin. **No commit/push performed.**
- Dead code `src/backend/**` (11 files, incl. the unsigned legacy session writer) — **confirmed fully unreferenced and removed** via `git rm` (working tree only).
- Stale nested project copy `3D-ULPIN-…/` exists in workspace root; **not part of the build; documented for owner review, not deleted** (safety rule).
- Deployed URL probe: `ulpin-3d.web.app` / `ulpin-3d.firebaseapp.com` → **404** → no live production environment exists to test.

## 2. Environment Variable Audit — PASS (with 1 production gap)

All 34 `process.env` references classified:

| Variable | Class | Exposure check |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY/AUTH_DOMAIN/PROJECT_ID/STORAGE_BUCKET/MESSAGING_SENDER_ID/APP_ID/MEASUREMENT_ID/DATABASE_URL` | PUBLIC (Firebase web config — public by design) | ✅ used in `src/lib/firebase.ts`, `src/lib/society/storage.ts`, server routes; not a secret |
| `NEXT_PUBLIC_OTP_SERVICE_URL` | PUBLIC (endpoint URL) | ✅ |
| `SESSION_SECRET` | SERVER-ONLY | ✅ referenced only in `src/lib/auth/server/cookieSigner.ts` + `src/lib/auth/otpStore.ts` (server modules, `node:crypto`); **no client `.tsx` import found** |
| `FIREBASE_PROJECT_ID` (unprefixed) | SERVER-ONLY | ✅ server fallback in `sessionStore.ts` only |
| `SUPABASE_SERVICE_ROLE_KEY` | shim only | `src/lib/supabase/env.ts` is a legacy shim with **empty-string constants**; `isSupabaseAuthConfigured()` returns false → Supabase path disabled; no real secret in code |
| `NODE_ENV` | server | ✅ |

Findings:
- ✅ No private secret exposed via `NEXT_PUBLIC_*`; no Admin SDK credential in browser code; no secret rendered into HTML.
- ✅ `.env`/`.env.local`/`.env.*.local` are git-ignored; only `.env.example` (names only) is tracked.
- ⚠️ **`SESSION_SECRET` is NOT set in `.env.local`/`.env.example`** → production would use the documented prototype fallback constant. **Action required before go-live:** set a strong server-side `SESSION_SECRET` (see deployment checklist §2). No value was invented in this phase.
- ✅ No hardcoded production credentials in `src/` (only documented SIH demo credentials).

## 2b. Real Firebase Authentication Audit (code-level)

All nine auth methods audited: email/password ✅, demo persona (server-side map) ✅, OTP (rate-limited, signed claim) ✅, Google popup ✅ + redirect fallback (now processed on boot) ✅, registration (CITIZEN-only) ✅, password reset (OTP-backed) ✅, logout (server revoke + cookie clear) ✅, session restoration (signed-cookie authoritative) ✅.

Authoritative-role rule verified in code: **role always resolved by the server from the durable user/profile store** — never from the browser, localStorage, selected tab, URL, or any client-supplied field.

Real-credential browser logins: **NOT VERIFIED — REQUIRES LIVE PRODUCTION ENVIRONMENT**.

## 3. Live HTTP Test Results (LOCAL LIVE HTTP VERIFIED — production build on :3100)

- Public: `/`, `/auth/login` → **200** (login page 44 KB HTML).
- Protected pages signed-out → **307 → `/auth/login?next=…`** for all 20 routes probed — **measured 1–10 ms** per middleware decision.
- Protected APIs signed-out → **401** (`/api/auth/session`, `/api/users`, `/api/audit-log`).
- Unknown page (public space) → **404** via `not-found.tsx`; `error.tsx`, `loading.tsx`, `/unauthorized` all present.
- Open redirects (`https://`, `//`, `javascript:`) → neutralized to safe internal path.
- Full session-forgery matrix (9 cookie variants, 6 fake-token POSTs) → all rejected.
- **Deployment URL probe:** `ulpin-3d.web.app` / `ulpin-3d.firebaseapp.com` → **404 (not deployed)** → DEPLOYED-URL VERIFICATION: NOT VERIFIED — REQUIRES LIVE PRODUCTION ENVIRONMENT.

---

## 4. Firebase Status

| Area | Status |
|---|---|
| Web client config (8 × NEXT_PUBLIC_*) | ✅ configured in `.env.local` (names verified, values untouched) |
| Server token-verification path | ✅ code-verified (Identity Toolkit lookup; project fallback documented) |
| Real login against Firebase project | ⚠️ NOT VERIFIED — REQUIRES LIVE PRODUCTION ENVIRONMENT |
| OTP delivery (Apps Script) | ✅ endpoint wired, rate-limited; real-mailbox round-trip NOT VERIFIED — REQUIRES LIVE PRODUCTION ENVIRONMENT |

## 5. Firestore Status

- Rules audited (Phase 15 + re-read this phase) — **untouched, not weakened**. Society scoping enforced server-side: deterministic per-society memberships; reserved roles unwritable; self-role-change blocked; government collections gated by active officer documents; resident PII owner-or-authorized-readers only.
- URL-ID swapping (`/society/A→B`, `/case/A→B`, `/property/A→B`, `/building/A→B`, `/flat/A→B`): authorization enforced at the Firestore boundary (membership/owner predicates), not merely UI. Runtime cross-account probes: **NOT VERIFIED — REQUIRES LIVE PRODUCTION ENVIRONMENT** (needs ≥2 real accounts).
- Deployed-rules equivalence: **NOT VERIFIED — DEPLOYED FIREBASE ENVIRONMENT REQUIRED**.

## 6. Storage Status

`storage.rules` re-audited, untouched: society images ≤5 MB image MIME (same-society admin writes); verification evidence ≤15 MB image/PDF, **delete denied for all**; analysis documents per-path constraints; default-deny elsewhere. Oversize/MIME/cross-society/unauthorized-delete probes: **NOT VERIFIED — DEPLOYED FIREBASE STORAGE ENVIRONMENT REQUIRED**.

## 7. Production Deployment Status

**NOT DEPLOYED.** Target identified: Firebase Hosting `ulpin-3d` (us-central1). One **blocking gap**: server-only `SESSION_SECRET` missing from env — must be set before go-live. Full checklist: `phase16_production_deployment_checklist.md`. Nothing was deployed in this phase.

## 8–12. Role Workflow Verification

Per-role transition chains (Citizen→report; Society admin→approval; Officer→audit history; Admin→settings) audited at code + route level: every step's route exists, is permission-gated correctly (matrix re-verified), and its data layer is server-scoped. Browser click-through with real accounts per role: **NOT VERIFIED — REQUIRES LIVE PRODUCTION ENVIRONMENT**.

## 10. 2D GIS Status

Static: Leaflet 1.9.4 + react-leaflet 5 present; map page client-gated (dynamic import pattern); WGS-84 via Leaflet CRS; parcel/building layers from typed data modules; ULPIN/spatial-ID search wired to `demoSpatialIdRepository`; deep links `/map?property=…` covered by the `/map` route rule (authenticated). Hydration-safe loading by design. Browser rendering/hydration console/deep-link focus: **NOT VERIFIED — REQUIRES BROWSER**.

## 11. 3D Digital Twin Status

`@react-three/fiber` + `drei` + `three` (transpiled); floor slicing / isolation / explode / laser measurement / solar simulation modules present under `src/components/three/`; `SceneErrorBoundary` wired. **FPS, WebGL, memory-leak soak, low-GPU fallback: NOT MEASURED — REQUIRES BROWSER.**

## 12. AI Document Analysis Status

Assistive-by-design verified in code: OCR/blueprint outputs map to MATCH / POSSIBLE_MISMATCH / INSUFFICIENT_DATA; results route to OFFICER review (`DecisionSupportInsightsCard`, `government/ai-analysis` disclaimers); AI never auto-approves ownership or issues legal ULPIN (`isOfficialUlpin:false` in `ulpinGenerator.ts`). OCR accuracy on real scans: **NOT VERIFIED — REQUIRES LIVE PRODUCTION ENVIRONMENT**.

## 13. API Security Audit

All 14 API routes inventoried. Pattern verified across routes: `getSessionUser(req)` → `requirePermission(...)` → resource scoping → safe JSON errors; no stack traces/internal codes in responses (observed in regression probes). Unauthenticated → 401 (live-tested on 3 routes). Unauthorized-role → 403 path code-verified in `apiAuth.ts`; per-role live 403 probes require real sessions — REQUIRES LIVE ENV.

## 14. Error Handling

`error.tsx`, `loading.tsx`, `not-found.tsx`, `/unauthorized` present. Unknown public route → 404 (verified); unknown protected route → login redirect (verified). API errors return safe JSON — verified live. Firebase-unavailable/Firestore-failure UX: **NOT VERIFIED — REQUIRES LIVE ENV**.

## 15. Production Build

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **PASS — 0 errors** (incl. after dead-code removal) |
| `npm run lint` (= tsc --noEmit) | **PASS** |
| `npm run build` | **PASS — twice** (13 s initial, 19 s post-cleanup — MEASURED) |

---

## 18. Performance

- Build time: **13 s / 19 s MEASURED**.
- Signed-out middleware responses: **1–10 ms per route MEASURED** (20-route sweep).
- Login page HTML: **44 KB MEASURED**.
- Bundle sizes, 3D FPS, GIS tile timing, rerender profiling, listener-leak soak: **NOT MEASURED — REQUIRES BROWSER**.
- Firestore listener cleanup: code-reviewed (spot-checked `onSnapshot` teardown in society/GIS hooks); runtime soak NOT MEASURED.

## 19. Responsive / 20. Accessibility

Static audit only: Tailwind responsive breakpoints used consistently on dashboards/login; `aria-*` + `role="alert"` on auth screens; semantic headings; focus-visible styles. Keyboard-only navigation, screen-reader pass, device layout, measured contrast: **NOT VERIFIED — REQUIRES BROWSER**.

## 21. Navigation Audit

All `navigation.ts` targets and dashboard quick-actions re-mapped to the compiled route inventory post-cleanup: **0 dead links, 0 duplicates, no stale routes**.

## 22. Dead Code / Duplicate Auth Cleanup

- `src/backend/**` — 11 files, zero external references (symbol + path search) — **REMOVED** (`git rm`, staged, not committed); unsigned legacy session writer eliminated; tsc + build re-verified green.
- `3D-ULPIN-…/` nested copy — no dependencies found; **left in place; documented for owner decision**.
- `src/lib/supabase/*` — legacy shim (auth disabled, empty constants); retained as feature-flag module; harmless, documented.

## 23. Data Honesty

- `src/data/mockUsers.ts` — **Demo data** (SIH personas) — retained, documented.
- `src/data/demoSpatialIds.ts` + repository — **Prototype spatial IDs**; all `isOfficial:false`, `DSID-xxx` pattern — retained, correctly labelled.
- `src/data/properties.ts` — **Demo cadastral dataset** — retained.
- `ulpinGenerator.ts` — platform IDs carry `isOfficialUlpin:false` + disclaimer; official-ULPIN metadata explicitly describes *future* government-API status. **No legally-issued ULPIN is claimed anywhere.**
- Term scan (`mock/demo/fake/sample/placeholder`) reviewed — all legitimate fixtures, placeholders, or documentation; no disguised production data.

## 24. Final Security Regression

All V1–V10 re-proven live against the production build — see `phase16_security_regression_report.md`. **No regressions.**

## 25. Verdict

**LOCAL VERIFIED: YES. LIVE HTTP (LOCAL PRODUCTION BUILD) VERIFIED: YES. DEPLOYED PRODUCTION VERIFIED: NO — REQUIRES LIVE PRODUCTION ENVIRONMENT.** The codebase is deployment-ready pending the checklist in `phase16_production_deployment_checklist.md`; it must not be advertised as production-verified until the deployed URL, real Firebase accounts, deployed rules, and browser flows are tested.