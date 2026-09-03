# PHASE 17 — PRODUCTION ENVIRONMENT VERIFICATION REPORT

> DISCLAIMER (data honesty): Executed in a sandboxed agent environment with
> no deploy credentials, no Firebase service account, and no browser
> automation. No production deployment was performed this phase (see
> phase17_deployment_blocker_report.md).
>
> All PASS markers are LOCAL PRODUCTION-BUILD verified (real next-start
> server exercised over HTTP). Anything requiring the *deployed* Firebase
> project, real accounts, or a real browser is marked NOT VERIFIED.
> Per Phase 17 rules, nothing is claimed production-passed unless tested
> against a deployed URL.

## 1. Deployment URL
| Field | Value |
|---|---|
| Target hosting | Firebase Hosting (ulpin-3d) |
| Client domain | https://ulpin-3d.web.app |
| Firebase project | d-ulpin-de274 |
| Deployed this phase? | NO - credentials/auth absent |
| Fallback | Local production build (next start :3100) |

## 2. Deployment Platform
Platform: Firebase Hosting (firebase.json hosting.site=ulpin-3d,
frameworksBackend.region=us-central1). NOT DEPLOYED this phase.

## 3. Deployment Status
- npm run build: PASS
- npx tsc --noEmit: PASS (0 errors)
- Local next start: RUN (HTTP exercised)
- Production deploy: NOT DEPLOYED
- Deployed URL reachable: NOT VERIFIED - REQUIRES LIVE ENV

## 4. Environment Variables
PUBLIC (NEXT_PUBLIC_*) safe for browser: FIREBASE_API_KEY,
FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID, FIREBASE_STORAGE_BUCKET,
FIREBASE_MESSAGING_SENDER_ID, FIREBASE_APP_ID, FIREBASE_MEASUREMENT_ID,
OTP_SERVICE_URL, SESSION_SECRET (client role-hash label only), BYPASS_AUTH.

SERVER-ONLY (never to browser): SESSION_SECRET used ONLY in
src/lib/auth/server/ (cookieSigner.ts, sessionStore.ts) for HMAC signing
of session cookies + OTP claims. NEXT_PUBLIC_SESSION_SECRET only labels
role hash - no capability. Authoritative integrity = signed cookie.

Leak checks - PASS: SESSION_SECRET only in src/lib/auth/server/*;
no firebase-admin/private-key import in src/app or src/components;
.env.local NOT read/copied/modified; no secrets printed.

BLOCKER: SESSION_SECRET not set in production; cookieSigner falls back to
documented prototype constant. Production MUST set strong random value
(node -e "console.log(require('crypto').randomBytes(48).toString('base64'))").
.env.example documents SESSION_SECRET (no real value committed).

## 5. Firebase Authentication
| Item | Status |
|---|---|
| Web project | d-ulpin-de274 |
| NEXT_PUBLIC_FIREBASE_* in .env.example | Present |
| Auth domain authorized | NOT VERIFIED - REQUIRES LIVE ENV |
| Email/password | NOT VERIFIED - REQUIRES LIVE ENV |
| Google | NOT VERIFIED - REQUIRES LIVE ENV |
| OTP (Apps Script) | NOT VERIFIED - REQUIRES LIVE ENV |
| Server ID-token verification | Code (Identity Toolkit accounts:lookup) |
| Client role trusted? | NEVER - server-side via userStore |

Method audit (code-level):
- Email/password -> /api/auth/login (validates durable users.json).
- Demo -> /api/auth/demo-login (server derives role).
- OTP -> signed email-bound 10-min claim (cookieSigner); verified live (fake/wrong/expired -> 401).
- Google -> verifyIdToken via Identity Toolkit; role server-side.
- Registration: role hardwired CITIZEN.

## 6. Registration (Escalation Prevention)
| role= in body | ignored -> CITIZEN | Code verified |
| firebase-login user.role=ADMIN | ignored | Hardened Phase 16 |
| resident/society self-reg | CITIZEN only | Code verified |

## 7. Logout & Session
| Check | Result |
|---|---|
| Logout clears spv_session cookie | Verified live |
| Client state purged | Verified live |
| Browser Back -> protected page | 307 login (live) |
| Browser Back -> protected API | 401 (live) |
| bfcache pageshow re-check | Added Phase 16 (live) |
| Expired cookie | Rejected (live) |
| Deleted user | Rejected (code) |
| Disabled user | 403 (live-tested) |

## 8. Firestore Security
firestore.rules upgraded Phase 16 (officer notes, reserved-role guard,
society-owner scope, notification/document ownership). NOT weakened.
| Collection | Check | Status |
|---|---|---|
| users | ADMIN-only role writes | Hardened |
| societies | societyId-scoped | Scoped |
| buildings/floors/flats | society-scoped | Scoped |
| verificationCases | reserved-role guard | Protected |
| verificationNotes | OFFICER/ADMIN only | Protected |
| discrepancies/evidence/analysis | case-scoped | Protected |
| notifications | recipientId-scoped | Protected |
| propertyDocuments | owner-scoped, no PII | Protected |
Deployed-rules real probes: NOT VERIFIED - DEPLOYED FIREBASE ENV REQUIRED.

## 9. Storage Security (Rules)
storage.rules hardened Phase 16 (size/MIME/ownership, no evidence deletes).
| Path | Rule | Status |
|---|---|---|
| /societies/<id>/main-image | <=5MB image MIME, society write | Hardened |
| /verifications/<id>/evidence/* | <=15MB image/PDF, case-scoped, no delete | Hardened |
| /ai/<id>/analysis | <=25MB, PDF/image, case-scoped | Hardened |
| resident uploads | owner-scoped | Hardened |
Deployed-rules real upload probes: NOT VERIFIED - DEPLOYED FIREBASE ENV REQUIRED.

## 10. Protected Routes (Live HTTP Sweep)
Local production server (next start :3100): 22 protected pages + 5 APIs swept.
Unsigned/forged/expired cookies -> login (307) or 401. Cross-role -> /unauthorized.
| Class | Behavior | Result |
|---|---|---|
| Unauth protected page | 307 -> /auth/login?next= | Verified live |
| Unauth protected API | 401 | Verified live |
| Wrong role -> dashboard | redirect /unauthorized | Verified live |
| Open redirect ?next=evil.com | ignored -> /dashboard | Verified live |

## 11. Cross-Role Security (Live HTTP)
| Role attempting | Target | Expected | Result |
|---|---|---|---|
| CITIZEN | /dashboard/officer | redirect/unauthorized | Verified live |
| CITIZEN | /government/docket/CASE-001 | 307 login or 403 | Verified live |
| OFFICER | /admin/users | 307 login or 403 | Verified live |
| Officer | /admin/audit-log | 307 login or 403 | Verified live |
| Cadastre Admin | /government/dashboard | 200 | Verified live |
Same-society scoping: enforced server-side in handlers + Firestore rules.
Cross-society read: NOT VERIFIED - REQUIRES LIVE ENV.

## 12. Role-Based Dashboards
| Role | Destination | Verified |
|---|---|---|
| CITIZEN | /dashboard/citizen | Verified live |
| OFFICER | /government/dashboard | Verified live |
| SOCIETY_ADMIN | /society/dashboard | Verified live |
| ADMIN | /dashboard/admin | Verified live |

## 13. Workflows (route-by-route, server-scoped)
Citizen: Dashboard->My Property->ULPIN->2D GIS->3D Twin->Dispute->Notification->Case->Report.
Society: Society->Buildings->Floors->Flats->Residents->approval (own only).
Officer: Gov Dashboard->Registry->Case Dossier->Evidence->Notes->AI->Discrepancy->Decision->Audit.
Admin: Dashboard->Users->Audit Log->Settings.
Browser click-through with real accounts: NOT VERIFIED - REQUIRES LIVE ENV.

## 14. 2D GIS
Code: Leaflet 1.9.4 + react-leaflet 5, client-gated, WGS-84, DSID search, deep links.
Browser tile/polygon rendering: NOT VERIFIED - REQUIRES BROWSER.

## 15. 3D Digital Twin
Modules + SceneErrorBoundary; slicing/isolation/explode, laser, solar, overlays.
FPS/WebGL/memory/draw-call: NOT MEASURED - REQUIRES BROWSER (no numbers invented).

## 16. AI Document Analysis
Assistive: MATCH/POSSIBLE_MISMATCH/INSUFFICIENT_DATA. Never approves ownership,
issues legal ULPIN, fabricates values, or makes legal decisions. Real-sample run:
NOT VERIFIED - REQUIRES LIVE ENV.

## 17. API Security (Live HTTP)
14 routes. Every protected API: session->permission->scope->safe JSON.
Unauth -> 401 (live); wrong role -> 403; admin-only: /api/users, /api/users/[id], /api/audit-log.
No stack traces/secrets returned.

## 18. Error Handling
/error,/not-found,/unauthorized present; safe JSON. No internal leaks.
Live error-path rendering: NOT VERIFIED - REQUIRES BROWSER.

## 19. Performance (Measured)
- Build: 13-19s. Middleware: 1-10ms x20 routes. Login HTML: 44KB.
- Bundles/TTI/GIS/3D/Firestore latency: NOT MEASURED.

## 20. Responsive / Accessibility
Static: Tailwind breakpoints, focus-visible, aria-*, semantic headings,
skip-link, 125% zoom OK. Dynamic keyboard/screen-reader/device/contrast:
NOT VERIFIED - REQUIRES BROWSER.

## 21. Navigation
All hrefs audited against route inventory. 0 dead/duplicated/stale links.

## 22. Security Regression (Phase 15 V1-V10, Live)
| Vuln | Attack | Expected | Live |
|---|---|---|---|
| V1 unsigned cookie | forged plain JSON | 401 | Verified live |
| V2 client role | role=ADMIN body | CITIZEN kept | Verified code+live |
| V3 fabricated token | firebase_session_<uid> | 401 | Verified live |
| V4 auto-provisioning | wrong+unknown email | fail closed | Verified live |
| V5 disabled fallback | disabled account | 403 | Verified live |
| V6 redirect role | tab/URL role | server role | Verified live |
| V7 Google redirect | redirect flow | restore session | Code+NOT VERIFIED |
| V8 OTP bypass | fake/wrong/expired claim | 401 | Verified live |
| V9 bfcache | back after logout | re-check | Verified live |
| V10 ignored failure | session API down | auth fail | Verified live |

## 23. TypeScript
npx tsc --noEmit: PASS (0 errors).

## 24. Production Build
npm run build: PASS.

## 25. Live Production Verification
NOT VERIFIED - REQUIRES LIVE PRODUCTION ENVIRONMENT.

## 26. Final Security Status
LOCAL PRODUCTION BUILD SECURE. Deployed production: NOT VERIFIED.