# Phase 16 — Production Deployment Checklist (BHU-VERIFY)

**Deployment target identified:** Firebase Hosting — site `ulpin-3d` (frameworks backend, region `us-central1`), configured in `firebase.json` with `firestore.rules` + `storage.rules`. A previous local prepare step exists at `.firebase/ulpin-3d/hosting/`.

**Live status:** `https://ulpin-3d.web.app` and `https://ulpin-3d.firebaseapp.com` both return **HTTP 404** — the site is **not currently deployed**. Deployment was NOT performed in this phase (not authorized / no credentials).

---

## 1. Pre-deployment (code)

- [x] `npx tsc --noEmit` — 0 errors (verified)
- [x] `npm run build` — passes (verified twice, incl. after dead-code removal)
- [x] `npm run lint` (= `tsc --noEmit`) — passes
- [x] All Phase 15 security fixes present and live-regression tested (see phase16_security_regression_report.md)
- [x] Dead code removed: `src/backend/**` (unused, contained unsigned session writer)
- [ ] Stale nested copy `3D-ULPIN-…/` — **documented for owner review, NOT deleted**

## 2. Environment variables (Firebase Hosting / functions backend)

Set in hosting env config (`.env` at build time or Firebase `frameworksBackend` env vars):

| Variable | Scope | Present in `.env.local`? | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | client | ✅ | public web config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | client | ✅ | |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | client | ✅ | project `d-ulpin-de274` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | client | ✅ | Storage optional feature |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | client | ✅ | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | client | ✅ | |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | client | ✅ | analytics, optional |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | client | ❌ (code falls back to `https://d-ulpin-de274-default-rtdb.firebaseio.com/`) | recommended: set explicitly |
| `NEXT_PUBLIC_OTP_SERVICE_URL` | client+server | ❌ (code falls back to the published Apps Script URL) | recommended: set explicitly |
| **`SESSION_SECRET`** | **server only** | ❌ **MISSING** | ⚠️ **REQUIRED FOR PRODUCTION** — currently falls back to a documented prototype constant (`bhu-verify-cadastre-otp-hmac-secret-2024`). Must be set to a strong random value (≥32 bytes) on the server before go-live. Rotating it invalidates all existing sessions (acceptable at first deploy). |

No private/symmetric secret is referenced by any `NEXT_PUBLIC_*` variable; no Admin credential is imported into browser code; `.env*` files are git-ignored (verified in `.gitignore`).

## 3. Firebase project configuration

- [ ] `firebase deploy --only firestore:rules` — deploy `firestore.rules` (audited Phase 15/16, untouched)
- [ ] `firebase deploy --only storage` — deploy `storage.rules`
- [ ] Enable Email/Password + Google providers in Firebase Auth
- [ ] Add hosting domains (`ulpin-3d.web.app`, custom domain if any) to Firebase Auth **Authorized domains**
- [ ] Add production URL to OAuth redirect whitelist (Google sign-in)
- [ ] Configure App Check (recommended hardening; not currently enforced in code)
- [ ] Confirm RTDB rules for `otps/` mirror the OTP TTL/one-time-use semantics

## 4. Deployment (when authorized)

```bash
npm run build          # verified passing
firebase deploy --only hosting,firestore:rules,storage
```

- [ ] Verify production URL serves 200 on `/`, `/auth/login`
- [ ] Re-run Phase 16 regression battery (§ security regression report) against the **deployed** URL
- [ ] Confirm deployed Firestore rules version matches repo (console → Rules history)

## 5. Post-deployment smoke tests (must be re-run on the LIVE URL)

- [ ] Citizen / Officer / Admin real logins → correct dashboards
- [ ] Forged-cookie probe → 401 on APIs
- [ ] Protected pages signed-out → 307 to login
- [ ] OTP send/verify round-trip with a real mailbox
- [ ] Society image upload ≤5MB accepted; 6MB rejected
- [ ] Evidence upload ≤15MB image/PDF accepted; other MIME rejected
- [ ] Citizen blocked from `verificationNotes` reads in console

## 6. Not done in this phase (explicit)

- **Deployment**: NOT PERFORMED — requires owner authorization + Firebase credentials.
- **Deployed-rules probes**: NOT VERIFIED — REQUIRES LIVE PRODUCTION ENVIRONMENT.
- **Real-Firebase login/OTP/Google flows in a browser**: NOT VERIFIED — REQUIRES LIVE PRODUCTION ENVIRONMENT.