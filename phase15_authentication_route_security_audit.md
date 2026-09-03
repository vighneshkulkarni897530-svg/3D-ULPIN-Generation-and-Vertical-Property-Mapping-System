# Phase 15 — Complete Login, Authentication & Route-Guard Audit Report

**Project:** BHU-VERIFY — 3D ULPIN Generation and Vertical Property Mapping System
**Date:** 2026-09-03
**Method:** Static audit (full auth-stack read) → root-cause fixes → `npx tsc --noEmit` → `npm run build` → **live HTTP verification against a running dev server** (unauthenticated sweep + forged-cookie privilege-escalation tests).

---

## 1. Executive Summary

The Phase 1–14 authentication architecture (server-issued httpOnly session cookie + edge middleware + `ProtectedRoute` + centralized permissions + server-side `requireAuth`/`requirePermission` on every API route) is **sound and was preserved**. However, the audit found critical vulnerabilities in the session-issuing layer and login flows, all now fixed:

| # | Severity | Vulnerability | Status |
|---|----------|---------------|--------|
| V1 | **CRITICAL** | Session cookie was unsigned JSON — a hand-crafted cookie could impersonate any account (incl. admin) | **FIXED** (HMAC-SHA256 signing) |
| V2 | **CRITICAL** | `/api/auth/firebase-login` accepted a client-supplied `role` and upserted it → trivial privilege escalation | **FIXED** (role never accepted from client) |
| V3 | **HIGH** | Client-fabricated `firebase_session_<uid>` / `reg_session_<id>` tokens minted sessions with zero verification | **FIXED** (rejected; real tokens verified server-side) |
| V4 | **HIGH** | `firebaseLoginWithEmail` auto-created a Firebase account on `auth/user-not-found` (account squatting via wrong password + unknown email) | **FIXED** (fail closed) |
| V5 | **HIGH** | `login()` fell back to Firebase auth on *any* server rejection — disabled accounts could re-enter via fallback | **FIXED** (fail closed on 4xx) |
| V6 | MEDIUM | Post-login redirect used the selected UI tab, not the server-verified role | **FIXED** |
| V7 | MEDIUM | Google **redirect** fallback dead — `checkGoogleRedirectResult()` imported but never called | **FIXED** |
| V8 | MEDIUM | OTP-verified login had no server-verifiable proof | **FIXED** (signed, email-bound, TTL'd OTP claim) |
| V9 | LOW | Back-button (bfcache) after logout could render stale authenticated UI | **FIXED** (`pageshow` re-validation) |
| V10 | LOW | `verifyOtp` ignored session-establishment failures | **FIXED** |

**Live verification (real dev server, real HTTP):** every protected page returns `307 → /auth/login?next=…` signed out; every protected API returns `401`; and a **forged admin cookie now receives `401`** from `/api/auth/session` and `/api/users` (before the fix it would have returned the impersonated admin profile).

---

## 2. Authentication Architecture (audited, preserved)

```
Login (page) ──► AuthContext.login()
   │ 1. POST /api/auth/login            ← authoritative: durable userStore (scrypt), role from server
   │ 2. fallback: Firebase client auth  ← only when server unreachable; never auto-provisions
   │ 3. POST /api/auth/firebase-login   ← server verifies identity, mints SIGNED session cookie
   ▼
httpOnly cookie `spv_session` (JSON + HMAC `sig`, 365 d, sameSite=lax, secure in prod)
   ▼
Edge Middleware (Phase 10) ── checks cookie PRESENCE only
   • public: / , /auth/* , /unauthorized , /api/auth/* , static , /api/gis-selftest
   • pages without cookie → 307 /auth/login?next=<path>
   • /api/*  without cookie → 401 JSON
   ▼
<ProtectedRoute> ── client guard; renders loader until authStatus ≠ initializing (no flash)
   • unauthenticated → /auth/login?next=…     • unauthorized → /unauthorized?next=…
   ▼
API routes ── getSessionUser(req): signature + expiry + userStore re-validated server-side;
             requirePermission(...) re-checks role. Browser role values are never trusted.
```

**Key files:** `src/lib/firebase.ts`, `src/lib/firebase/auth.ts`, `src/context/AuthContext.tsx`, `src/lib/auth/server/sessionStore.ts`, `src/lib/auth/server/cookieSigner.ts` (new), `src/lib/auth/server/{apiAuth,userStore,authService,profiles,auditStore,otpStore}.ts`, `src/lib/auth/{permissions,sessionCookie,navigation}.ts`, `src/proxy.ts`, `src/components/auth/{ProtectedRoute,RouteGuards,FullScreenLoader}.tsx`, `firestore.rules`, `storage.rules`.

**Session resolution (`getSessionUser`)** is authoritative for role: cookie → signature check → userStore lookup → deleted-tombstone check → disabled-status check → **role comes from the server store, never the cookie**. The Supabase path (when configured) does the same via `profiles`.

---

## 3. Complete Login Route Audit

| Route | Method | Gate | Audit result |
|---|---|---|---|
| `/api/auth/login` | POST | public | ✅ scrypt-hashed password check vs durable userStore; **signed** cookie; role from server; `ACCOUNT_DISABLED` → 403 surfaced verbatim. |
| `/api/auth/firebase-login` | POST | public | ⚠️→✅ **Was the escalation hole (V2/V3).** Now: real Firebase ID tokens verified server-side (Identity Toolkit `accounts:lookup`); fabricated token prefixes → 401; OTP flow requires signed claim; **role never accepted from client**; deleted/disabled checks; audit on success. |
| `/api/auth/demo-login` | POST | public | ✅ Role key restricted to `citizen/officer/admin`; identity resolved from server persona map — client cannot name an email/role. |
| `/api/auth/otp/send` | POST | public | ✅ Rate-limited; dev OTP only outside production. |
| `/api/auth/otp/verify` | POST | public | ⚠️→✅ Returns `sessionClaim` (HMAC, email-bound, 10-min TTL) consumed by `firebase-login`. |
| `/api/auth/register` | POST | public | ✅ CITIZEN-only; role **never** read from body; email-confirmation-aware; friendly duplicate/weak-password/rate-limit errors. |
| `/api/auth/reset-password` | POST | public | ✅ OTP-backed; hash updated server-side. |
| `/api/auth/session` | GET | cookie | ✅ Authoritative projection; single refresh point; 401 + cookie hygiene. |
| `/api/auth/logout` | POST/GET | cookie | ✅ Revokes server session, clears cookie, audits LOGOUT, idempotent. |

**Login failure cases (verified in code paths):** wrong password / unknown user / invalid-credential → generic “Incorrect email or password.” (no Firebase internals); empty/invalid email or password → client validation; disabled account → explicit message and **no fallback**; network error → friendly error; too-many-requests → throttle message. Raw Firebase codes/stack traces no longer surfaced.

---

## 4. Role Matrix

Roles: `CITIZEN (rank 1) < OFFICER (rank 2) < ADMIN (rank 3)` — `src/types/auth.ts` + `src/lib/auth/permissions.ts`.

| Capability | CITIZEN | OFFICER | ADMIN |
|---|---|---|---|
| BROWSE_REGISTRY (properties/buildings/floors/map/conflicts/workflow) | ✅ | ✅ | ✅ |
| VIEW_OWN_NOTIFICATIONS / SUBMIT_DISPUTE / REQUEST_FIELD_VERIFICATION / VIEW_VERIFICATION_STATUS | ✅ | ✅ | ✅ |
| VIEW_REPORTS | ✅ | ✅ | ✅ |
| VIEW_VERIFICATION_QUEUE (`/government/*`, `/verification`, `/dashboard/officer`) | ❌ | ✅ | ✅ |
| VIEW_FIELDSHEET (`/verification/field`) | ❌ | ✅ | ✅ |
| RUN_SPATIAL_VALIDATION (`/ai-extraction`) | ❌ | ✅ | ✅ |
| USER_MANAGEMENT (`/admin/users`) | ❌ | ❌ | ✅ |
| VIEW_ACTIVITY_LOG (`/admin/audit-log`) | ❌ | ❌ | ✅ |
| SYSTEM_ADMIN (`/settings`, `/admin`) | ❌ | ❌ | ✅ |
| ACCESS_DASHBOARD_ADMIN (`/dashboard/admin`) | ❌ | ❌ | ✅ |

Society **membership roles** (`society-admin`, `resident`) are per-society, stored in `societyMembers/{societyId}_{uid}`, and enforced by Firestore rules — they are *not* global login roles, so the login screen correctly shows only Citizen / Government Officer / Cadastre Admin.

---

## 5. Complete Route Protection Matrix

Inventory built from the filesystem (`src/app/**/page.tsx` = 55 pages; 14 API routes) and cross-checked against `ROUTE_RULES` + middleware + live HTTP.

**Public (no session):** `/`, `/auth/login`, `/auth/register`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`, `/unauthorized`. Live test: `/auth/login` → **200**, `/unauthorized` → **200**.

**Any authenticated user (`permission: null`):** `/dashboard`, `/dashboard/citizen`*, `/profile`, `/notifications` (VIEW_OWN_NOTIFICATIONS), `/disputes`, `/disputes/new`, `/field-verification/request`, `/resident/*` (dashboard, property, cases, cases/[caseId], notifications, pending, profile, register), `/society/*` (register, [societyId], buildings, floors, residents). Live test: `/society/register`, `/resident/register` → **307** signed-out.

**BROWSE_REGISTRY:** `/properties`, `/properties/[id]`, `/properties/[id]/digital-twin`, `/properties/[id]/verification`, `/buildings`, `/buildings/[id]`, `/buildings/[id]/floors`, `/floors`, `/map`, `/conflicts`, `/workflow`, `/reports` (VIEW_REPORTS). Live test: all → **307** signed-out.

**OFFICER+ (VIEW_VERIFICATION_QUEUE / VIEW_FIELDSHEET / RUN_SPATIAL_VALIDATION):** `/government/dashboard`, `/government/societies`, `/government/societies/[societyId]`, `/government/societies/[societyId]/analytics`, `/government/analytics`, `/government/analytics/societies`, `/government/cases/[caseId]`, `/government/ai-analysis`, `/verification`, `/verification/field`, `/ai-extraction`, `/dashboard/officer`. Live test: → **307** signed-out.

**ADMIN only (USER_MANAGEMENT / VIEW_ACTIVITY_LOG / SYSTEM_ADMIN / ACCESS_DASHBOARD_ADMIN):** `/admin/users`, `/admin/audit-log`, `/settings`, `/dashboard/admin`. Live test: `/admin/users`, `/settings`, `/dashboard/admin` → **307** signed-out; redirect target `Location: /auth/login?next=%2Fadmin%2Fusers` ✓.

**API routes:** `/api/auth/*` public-by-design (self-gated); all others (`/api/users`, `/api/users/[id]`, `/api/audit-log`, `/api/registry/bootstrap`) → **401** signed-out (live-tested `/api/users`); `/api/gis-selftest` intentionally open (read-only self-test). Role checks inside each route use `requirePermission` against the session-resolved role.

\* `/dashboard/citizen` is open to all authenticated roles by design: its content is shared registry-level views (see PERMISSION_MATRIX “Shared views”); it is a redirect *target*, not an exclusive zone.

**Rule-ordering check:** `/admin/users` and `/admin/audit-log` precede `/admin`; `/verification/field` precedes `/verification`; `/dashboard/admin` and `/dashboard/officer` precede `/dashboard` → the most restrictive rule wins; no conflicting overlaps found.

**Orphans/dead/duplicates:** none found — every navigation link in `src/lib/navigation.ts` resolves to a built route; no duplicate `page.tsx` at conflicting segment depths. (`3D-ULPIN-…/` nested folder in the workspace root is a stale copy, not part of the build.)

---

## 6. Login Redirect Matrix

Canonical mapping (Phase 15): **server-verified role → dashboard**, `?next=` (same-origin relative only) takes priority.

| Role (from server session) | Destination after login |
|---|---|
| CITIZEN | `/dashboard/citizen` |
| OFFICER | `/dashboard/officer` |
| ADMIN | `/dashboard/admin` |
| Any + valid `?next=/path` | `/path` (validated: must start with `/`, must not start with `//`) |

Redirect decision points audited:
- `/auth/login` submit → `result.role` (server) → `ROLE_DASHBOARDS`; fallback demo-email match → selected tab (V6 fix). No conflicting second system remains.
- `/dashboard` index → CITIZEN→`/dashboard/citizen`, OFFICER→`/dashboard/officer`, ADMIN→`/dashboard/admin` (server role via `useAuth().role`); unauthenticated → `/auth/login?next=/dashboard`.
- Middleware login-page bounce: signed-in users hitting `/auth/login|register` → `/dashboard`.
- Logout → `/auth/logout` page → `/auth/login`.
- **No redirect loops** found: middleware redirects only when cookie is absent; logout clears the cookie (V-era loop bug documented and already fixed in Phase 14 logout flow); `initializeAuth` terminates in a definitive state; bfcache restore re-runs it once per `pageshow`.

---

## 7. Logout Verification

Flow: `logout()` → `POST /api/auth/logout` (server revokes Supabase session, clears `spv_session` with `maxAge=0`, audits LOGOUT) → Firebase `signOut` → client state cleared → redirects to public page.

- ✅ Cookie cleared server-side (httpOnly, so client cannot retain a usable token).
- ✅ All API calls after logout → 401 (live-tested with forged/stale cookie).
- ✅ All protected pages after logout → 307 to login (middleware: cookie absent).
- ✅ Back-button: middleware blocks re-fetch (no cookie); bfcache restores are re-validated by the new `pageshow` listener (V9), which re-runs `initializeAuth` and forces `unauthenticated` + Firebase sign-out when the server says no session.
- ✅ `/auth/logout` page itself is public and idempotent.

---

## 8. Registration Verification

| Flow | Endpoint | Role assignment | Escalation safety |
|---|---|---|---|
| `/auth/register` | `POST /api/auth/register` + Firebase/Supabase signup + OTP verify | CITIZEN only — role **never** read from body (server constant) | ✅ Client `role` field ignored |
| `/resident/register` | `createResidentRegistration` (Firestore, rules-enforced) | `resident` membership created ONLY by that society's active society-admin during approval; applicant cannot self-approve | ✅ `userId`/`email` from Auth session, never form data |
| `/society/register` | `createSocietyWithAdmin` (Firestore batch, rules-enforced) | Creator becomes `society-admin` **of the society they just created** — `createdBy` = `auth.currentUser.uid` | ✅ Identity from Firebase Auth only |

- Duplicate handling: email-taken → friendly 400 (both userStore and Supabase paths; Supabase obfuscated `identities: []` case covered).
- Pending approval: resident registrations start `pending`; approval atomic via transaction + deterministic claim ID; rejected claims resubmittable only by the same user.
- Registration sessions: `reg_session_<id>` cookies are now signed like every other session (V1 fix) and resolve via `userId`/`email` fields in the signed payload.
- Role escalation prevention: no registration route accepts a role; reserved roles (`super-admin`, `officer`, `admin`) are unwritable in Firestore rules; a member can never change their own role (rules check `!(resource.data.userId == request.auth.uid && request.resource.data.role != resource.data.role)`).

---

## 9. Citizen Access Verification

Citizen → `/dashboard/citizen` → My Property (`/resident/property`) → Spatial Identity / 2D GIS / 3D Digital Twin (`/properties/[id]`, `/properties/[id]/digital-twin`) → Dispute (`/disputes/new`) → Notifications (`/notifications`) → Case Dossier (`/resident/cases/[caseId]`) → Cadastral Report (`/reports`).

- ✅ All citizen destinations live-tested: signed-out access → 307.
- ✅ Route-wise, a citizen **cannot** reach `/government/*`, `/admin/*`, `/verification`, `/ai-extraction`, `/dashboard/officer`, `/dashboard/admin`, `/settings` — enforced by ROUTE_RULES + ProtectedRoute, and by `requirePermission` on APIs.
- ✅ Data scoping: resident/property reads in Firestore rules require `resource.data.userId == request.auth.uid` (owner) or an authorized officer/admin; government internal notes live in officer-only collections.
- ⚠️ NOT VERIFIED — REQUIRES LIVE ENVIRONMENT: full click-through with a real citizen account against production Firebase project (auth + Firestore data).

## 10. Society Admin Access Verification

Society admin → `/society/register` (creator becomes per-society `society-admin`) → Society Details (`/society/[societyId]`) → Buildings → Floors → Flats → Residents (`/society/[societyId]/residents`).

- ✅ Scoping: all society writes check an **active `society-admin` membership of THAT society** (`societyMembers/{societyId}_{uid}`); a society-admin of society A cannot mutate society B (deterministic membership ID + cross-service rule checks). Identity fields on societies are immutable except by the same admin; deletion of resident memberships by other admins is constrained.
- ✅ Residents list / approvals: only the same-society admin; resident PII reads are owner-or-same-society-admin (plus authorized officers).
- ⚠️ NOT VERIFIED — REQUIRES LIVE ENVIRONMENT: cross-society probes with two real society accounts.

## 11. Government Officer Access Verification

Officer → `/government/dashboard` → Society Registry (`/government/societies`) → Society Verification (`/government/societies/[societyId]`) → Verification Cases (`/government/cases/[caseId]`) → Evidence → Investigation Notes → AI Analysis (`/government/ai-analysis`) → Discrepancy → Decision → Audit History.

- ✅ Officer-only prefixes gated by VIEW_VERIFICATION_QUEUE/VIEW_FIELDSHEET/RUN_SPATIAL_VALIDATION (citizens blocked; live-tested 307 signed-out).
- ✅ Officer is NOT admin: no USER_MANAGEMENT / SYSTEM_ADMIN / VIEW_ACTIVITY_LOG / ACCESS_DASHBOARD_ADMIN → `/admin/*`, `/settings`, `/dashboard/admin` blocked.
- ✅ Confidential investigation notes: kept in officer-gated collections (`verificationNotes`-type data behind officer checks; Firestore rules reject citizen reads); citizens only ever receive their own case status, never internal notes. Do-not-weaken instruction respected — rules untouched.
- ⚠️ NOT VERIFIED — REQUIRES LIVE ENVIRONMENT: end-to-end case workflow with a real officer login.

## 12. Cadastre Admin Access Verification

Admin → `/dashboard/admin` → `/admin/users` (USER_MANAGEMENT) → `/admin/audit-log` (VIEW_ACTIVITY_LOG) → `/settings` (SYSTEM_ADMIN) + full officer/citizen shared views.

- ✅ Admin retains all administrative access; admin-only routes unreachable for CITIZEN and OFFICER (permission matrix + API `requirePermission`).
- ✅ Admin deletion tombstones (`deletedIds`) are honored by `getSessionUser` → deleted users lose access on next request even with a valid cookie.
- ✅ Admin cannot change own role via `societyMembers` writes (rules), and admin user-management routes re-validate server-side.

---

## 13. Firestore Security Audit

Reviewed `firestore.rules` (untouched — no weakening):

- `societyMembers`: self-bootstrap only as own `society-admin` (deterministic `{societyId}_{uid}`) or as `resident` for self; approval path lets a same-society admin create `resident` for another user **of their society**; reserved roles unwritable; self-role-change blocked; admin cannot promote themselves into another society.
- `societies`: create requires `request.resource.data.createdBy == request.auth.uid`; update only by an active society-admin of that society (identity fields immutable).
- `buildings`/`floors`/`flats`: active society-admin of the owning society (writes); reads via membership or officer.
- `residents` (claims/profiles): read = owner, same-society active admin, or authorized officer; approval writes bind `approvedBy == request.auth.uid` and same-society membership; resident PII never world-readable.
- Government-only data (verification cases, investigation notes, discrepancies, evidence metadata, verification history): gated by active `governmentOfficers/{uid}` document; citizens denied.
- `notifications`/`propertyDocuments`/`documentAnalyses`: owner-scoped reads (`userId == request.auth.uid`) with officer/admin exceptions where designed.

**Conclusion:** UI route protection is *not* the only layer — server-side rules enforce the same boundaries. ⚠️ Rule *deployment* status not verifiable locally (`firebase deploy` not run — out of scope per Git safety); marked **NOT VERIFIED — REQUIRES LIVE ENVIRONMENT** for the deployed-rules behaviour.

## 14. Storage Security Audit

Reviewed `storage.rules` (untouched):

- `societies/{societyId}/main-image/`: read = authenticated; create/update = active same-society admin + ≤5 MB + `image/(jpeg|jpg|png|webp)`; delete = same-society admin.
- `verification-evidence/{societyId}/{targetId}/`: authenticated read; create = authenticated + ≤15 MB + image/PDF; **delete denied for everyone** (evidence immutability).
- `analysis-documents/…`: authenticated access with per-path constraints (AI analysis documents/blueprints).
- All other paths: implicitly denied (default-deny in rules v2).

⚠️ Deployed-rule behaviour and real upload probes: **NOT VERIFIED — REQUIRES LIVE ENVIRONMENT**.

---

## 15. Privilege Escalation Testing

| Attack | Vector | Result |
|---|---|---|
| Cookie forgery → admin impersonation | Hand-set `spv_session` JSON with `userId`/`email` of an admin (no sig) | **BLOCKED (live-tested):** `/api/auth/session` → **401**, `/api/users` → **401**. Signature check rejects; middleware presence-check alone grants no data. |
| Client-supplied role | `POST /api/auth/firebase-login { user: { role: 'ADMIN' } }` | **FIXED:** role field removed from the contract; server derives role from its own store |
| Fabricated token | `idToken: "firebase_session_<uid>"` / `reg_session_<id>` | **FIXED:** 401 “Invalid sign-in attempt” |
| OTP-flow bypass | `idToken: "otp_session_<email>"` without claim | **FIXED:** 401 “Your OTP session has expired…”; claim is HMAC-bound to the email, 10-min TTL |
| Wrong-password account creation | `auth/user-not-found` → auto `createUser` | **FIXED:** fail closed, generic error |
| Disabled-account re-entry | Server 403 → Firebase fallback | **FIXED:** no fallback on 4xx |
| URL-ID swapping (societyId / caseId / propertyId) | Change IDs in URL | Pages render only via membership/owner-scoped Firestore reads (rules); cross-society/cross-owner data denied server-side. ⚠️ runtime probe REQUIRES LIVE ENV |
| localStorage/client role tampering | Edit `useAuth()` state in devtools | Only reshapes UI; every API + middleware decision uses the server session. Client role is never an authority. |
| Open redirect | `?next=https://evil.com` or `?next=//evil.com` | **Blocked:** next must start with `/` and not `//` (validated in login page + middleware) |
| Direct Firestore/Storage calls | Bypass UI entirely | Enforced by `firestore.rules` / `storage.rules` (§13–14) |

## 16. Issues Found

See §1 table (V1–V10) for the complete list with severities. Additionally noted (no action required):
- Legacy `src/backend/auth/sessionService.ts` sets an unsigned `spv_session` cookie, but the module is dead code (only re-exported, never imported by active routes). Recommend deletion in a future cleanup phase.
- `data/users.json` gained one runtime self-registered CITIZEN record during testing (scrypt-hashed, normal userStore behaviour) — left uncommitted per Git safety.
- Middleware can only check cookie *presence* (edge runtime limitation); by design — the signed-cookie verification at the API boundary closes the gap (proven live).

## 17. Fixes Applied

| Fix | Files |
|---|---|
| HMAC session-cookie signing (sign on every write, verify on every read, constant-time compare; `SESSION_SECRET` with documented dev fallback) | **NEW** `src/lib/auth/server/cookieSigner.ts`; `sessionStore.ts` (`sig` field, sign in `setSessionCookie`, enforce in `getSessionUser`); all issuing routes inherit signing automatically |
| `firebase-login` hardening: server-side token verification, fabricated-token rejection, OTP-claim enforcement, role never from client | `src/app/api/auth/firebase-login/route.ts` (rewritten) |
| Signed OTP session claims | `src/app/api/auth/otp/verify/route.ts` (returns `sessionClaim`); `cookieSigner.ts` (`createOtpSessionClaim` / `verifyOtpSessionClaim`) |
| OTP flow wiring: claim → `completeLoginSession(…, claim)` → request `claim`; session failure propagated; server role returned | `src/context/AuthContext.tsx` (`verifyOtp`, `completeLoginSession`); `src/lib/firebase/auth.ts` (`verifyEmailOtp` returns claim) |
| No forged-token fallback; fail closed without a real Firebase ID token | `src/context/AuthContext.tsx` (`completeLoginSession`) |
| Remove auto-provisioning; generic safe errors | `src/lib/firebase/auth.ts` (`firebaseLoginWithEmail`) |
| Fail-closed login with disabled-account short-circuit; role returned | `src/context/AuthContext.tsx` (`login`) |
| Server-role-driven post-login redirect (`ROLE_DASHBOARDS`) + `safeNextPath()` | `src/app/auth/login/page.tsx` |
| Google redirect fallback processed on boot | `src/context/AuthContext.tsx` (`initializeAuth` calls `checkGoogleRedirectResult` first) |
| bfcache/back-button re-validation | `src/context/AuthContext.tsx` (`pageshow` listener) |
| Context type updated (`completeLoginSession` optional 3rd param; `AuthActionResult.role`) | `src/context/AuthContext.tsx` |

No `.env.local` changes, no Firestore/Storage rule changes, no hardcoded credentials, no data fabrication. Working tree only — **no git commit/push/branch/stash performed**.

---

## 18. Remaining Issues

1. **Live end-to-end login with real Firebase credentials** (all three roles + OTP + Google popup/redirect): NOT VERIFIED — REQUIRES LIVE ENVIRONMENT. All server-side paths are code-verified and the middleware/session layer is live-verified; the Firebase client login itself needs a browser + real project.
2. **Deployed Firestore/Storage rules** — rules files are correct and untouched; deployment/verification needs `firebase deploy` + console probes: NOT VERIFIED — REQUIRES LIVE ENVIRONMENT.
3. **Browser console cleanliness across all flows** (hydration warnings, unhandled rejections): NOT VERIFIED — REQUIRES LIVE ENVIRONMENT. Static equivalents checked: no protected content renders before auth state is known (FullScreenLoader gate), no `window` access during render on auth paths. Live dev-server HTTP behaviour verified instead (§5, §7, §15).
4. Cleanup recommendation (future phase): delete dead `src/backend/*` auth modules to remove the duplicate unsigned `spv_session` writer.
5. Stale nested project copy `3D-ULPIN-Generation-and-Vertical-Property-Mapping-System/` in the workspace — not part of the build; remove from the repo to avoid confusion.

## 19. TypeScript Result

`npx tsc --noEmit` → **PASS, 0 errors** (after fixes; intermediate errors from the `sig` field introduction were resolved by making `sig` optional-on-input / computed-on-write, and by typing the OTP claim as `string | boolean` at its single consumer).

## 20. Production Build Result

`npm run build` → **PASS**. Full route inventory compiled (55 pages, 14 API routes, Middleware/Proxy layer registered). No build or type failures.

## 21. Browser Console Result

NOT VERIFIED — REQUIRES LIVE ENVIRONMENT (no browser automation available). Static equivalents checked: protected content is loader-gated until `authStatus` resolves (no flash by construction); the new `pageshow` listener is registered/cleaned up correctly. Live dev-server HTTP verification performed in place of a browser session.

## 22. Final Security Status

| Criterion | Status |
|---|---|
| Every login option works (password / demo persona / OTP / Google popup+redirect / registration) | ✅ code-audited; ⚠️ live clicks REQUIRE LIVE ENV |
| Every role redirects correctly (server-authoritative) | ✅ |
| Every protected route protected (page 307 / API 401) | ✅ **live-tested** |
| Cross-role access blocked (citizen≠officer≠admin) | ✅ permissions matrix + API guards |
| Direct URL access secure | ✅ **live-tested** (22 pages swept) |
| Logout terminates session; back-button safe | ✅ + bfcache re-validation |
| Registration cannot self-elevate roles | ✅ server-constant CITIZEN; rules-enforced memberships |
| No forged-cookie access to APIs | ✅ **live-tested (401)** |
| Firestore authorization secure (rules untouched) | ✅ audited; deployed behaviour ⚠️ LIVE ENV |
| Storage authorization secure (rules untouched) | ✅ audited; ⚠️ LIVE ENV |
| No broken navigation links / dead routes | ✅ all links resolve to built routes |
| No redirect loops; open-redirect blocked | ✅ |
| No hydration/auth-loading flash | ✅ loader-gated via `authStatus` |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run build` | ✅ pass |
| Git safety (no commit/push; `.env.local` untouched) | ✅ |

**Phase 15 verdict:** the two critical holes (unsigned session cookie, client-controlled role upsert) and all supporting escalation paths are closed at the server boundary and verified live by HTTP probes. Remaining items are strictly environment-dependent and explicitly marked NOT VERIFIED — REQUIRES LIVE ENVIRONMENT.




