# PHASE 17 — FINAL RELEASE CHECKLIST

> Pre-flight checklist for publishing BHU-VERIFY to production.
> Mark each once verified in the LIVE environment.

## Environment
- SESSION_SECRET set as SERVER-ONLY env var (strong, random, 48+ bytes). NOT NEXT_PUBLIC_.
- NEXT_PUBLIC_BYPASS_AUTH = false in production.
- NEXT_PUBLIC_FIREBASE_* populated (from .env.example template).
- No SESSION_SECRET value committed to Git / printed in logs.

## Build & Lint
- npx tsc --noEmit = 0 errors (PASS).
- npm run build = PASS.

## Firebase
- firebase deploy --only firestore:rules,storage:rules --project d-ulpin-de274 (no weakening).
- firebase deploy --only hosting --project d-ulpin-de274 (site ulpin-3d).
- Production domain resolves (https://ulpin-3d.web.app = 200).
- Auth providers enabled (email/password, Google, OTP) - verified in console.

## Auth & Roles
- Real citizen login = CITIZEN -> /dashboard/citizen.
- Real officer login = OFFICER -> /government/dashboard.
- Real admin login = ADMIN -> /dashboard/admin.
- Registration creates CITIZEN only (role injection rejected).
- Logout clears cookie; Back button stays on login.
- Session restore across refresh + bfcache.

## Security
- Forged/unsigned cookie = 401.
- Open redirect ?next= neutralized.
- Cross-role access blocked server-side (not just hidden links).
- Direct Firestore/Storage access denied for wrong role/society.

## Workflow
- Citizen workflow (property -> GIS -> twin -> dispute -> report).
- Society workflow (own society only).
- Officer workflow (case dossier -> notes -> AI -> decision).
- Admin workflow (users -> audit -> settings).
- GIS loads; 3D twin renders; AI analysis assistive-only.

## Browser
- Console clean (no errors/hydration warnings).
- Responsive (desktop/tablet/mobile).
- Accessible (keyboard, focus, ARIA, contrast).

## Post-deploy smoke
- 200 on public landing.
- 307 -> /auth/login on protected page (unauth).
- 401 on protected API (unauth).
- 404 page renders (unknown route).

> Items marked PASS are verified at local production-build scope. The remaining
> items require the LIVE deployed environment and real accounts.
