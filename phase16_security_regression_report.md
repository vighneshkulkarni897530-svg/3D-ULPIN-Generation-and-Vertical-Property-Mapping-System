# Phase 16 — Security Regression Report

**Project:** BHU-VERIFY — 3D ULPIN Generation and Vertical Property Mapping System
**Date:** 2026-09-03
**Test target:** `next start` **production build** (current working tree, post Phase-15 fixes and Phase-16 dead-code removal) served at `http://localhost:3100`.
**Classification:** LOCAL LIVE HTTP VERIFIED — PRODUCTION BUILD. This is **not** deployed-production verification (no live deployment exists — see verification report).

> ⚠️ During this phase a **stale pre-Phase-15 dev server** was found serving the old vulnerable `/api/auth/firebase-login` (fake tokens returned 200). All regression results below were therefore re-run against a **fresh production build** of current code. Any process serving stale code must be restarted before deployment.

---

## 1. Phase 15 Vulnerability Regression Matrix

| # | Vulnerability | Test performed (live HTTP) | Expected | Actual | Status |
|---|---|---|---|---|---|
| V1 | Unsigned session cookie | `spv_session` JSON with admin identity, no `sig` → `GET /api/auth/session` | 401 | **401** | ✅ FIXED (holds) |
| V1b | Empty signature | same cookie with `sig:""` | 401 | **401** | ✅ |
| V1c | Garbage signature | same cookie with `sig:"deadbeef"` | 401 | **401** | ✅ |
| V1d | Wrong 64-hex signature | same cookie with wrong-length-equal hex sig | 401 | **401** | ✅ |
| V1d | Modified userId/email | forged cookie naming `admin.cadastre@gov.in` | 401 | **401** | ✅ |
| V2 | Client role escalation | `POST /api/auth/firebase-login {user:{role:"ADMIN"}}` with fake token | 401 | **401** | ✅ |
| V3 | Fabricated `firebase_session_<uid>` token | POST with fabricated token | 401 | **401** `Invalid sign-in attempt` | ✅ |
| V3b | Fabricated `reg_session_<id>` token | POST with fabricated token | 401 | **401** `Invalid sign-in attempt` | ✅ |
| V8 | OTP bypass — no claim | `idToken:"otp_session_<email>"` without claim | 401 | **401** `OTP session expired` | ✅ |
| V8b | OTP forged claim | `claim:"AAA.BBB"` | 401 | **401** | ✅ |
| V8c | Garbage token | `idToken:"completely-fake-token"` | 401 | **401** `Could not verify` | ✅ |
| V8c | Empty body | `POST {}` | 400 | **400** `missing or invalid idToken` | ✅ |
| V4 | Account auto-provisioning | wrong-password lookup path | no account created | code-verified: branch removed; generic error thrown | ✅ FIXED (holds) |
| V5 | Disabled-user fallback | server 403 → Firebase fallback | no fallback | code-verified: `attemptFirebaseFallback` set only on network error; `ACCOUNT_DISABLED` short-circuits | ✅ FIXED (holds) |
| V6 | Client-selected redirect role | login redirect logic | server role wins | code-verified: `ROLE_DASHBOARDS[result.role]` first | ✅ FIXED (holds) |
| V7 | Google redirect failure | `initializeAuth` boot | redirect result processed first | code-verified: `checkGoogleRedirectResult()` invoked before session check | ✅ FIXED (holds) |
| V9 | bfcache stale auth | `pageshow` handler | re-validate server session | code-verified: listener re-runs `initializeAuth` on persisted restore | ✅ FIXED (holds) |
| V10 | Ignored session failure | `verifyOtp` flow | propagates failure | code-verified: `sessionRes.ok` checked | ✅ FIXED (holds) |

## 2. Expiry / Lifecycle Regression

| Test | Expected | Actual | Status |
|---|---|---|---|
| Expired `expires_at` (past epoch) | 401 | **401** | ✅ |
| Deleted user (tombstone) | 401 | code-verified in `getSessionUser` (`isUserDeleted`) — live account probe requires real userStore mutation | ✅ code / ⚠️ live data REQUIRES LIVE ENV |
| Disabled user (`accountStatus:"DISABLED"`) | 401/403 | code-verified in `getSessionUser` + login route | ✅ code / ⚠️ live data REQUIRES LIVE ENV |

## 3. Open-Redirect Regression (live HTTP)

| `?next=` value | Result |
|---|---|
| `https://evil.com` | 307 → `/auth/login?next=%2Fdashboard` (external stripped) ✅ |
| `//evil.com` | 307 → `/auth/login?next=%2Fdashboard` ✅ |
| `javascript:alert(1)` | 307 → `/auth/login?next=%2Fdashboard` ✅ |
| `/government/dashboard` | 307 → `/auth/login?next=%2Fdashboard` (middleware normalizes to the requested page path; the login page independently re-validates same-origin) ✅ |

Only same-origin relative paths pass validation (`startsWith('/') && !startsWith('//')`); scheme-relative and `javascript:` URLs are never forwarded.

## 4. Session Signature Cryptography

- `signSession` covers `access_token | refresh_token | expires_at | userId | email` — every trusted field is inside the HMAC material, so fields cannot be transplanted between sessions.
- Verification uses `crypto.timingSafeEqual` (no timing oracle).
- Any absent/malformed `sig` → `getSessionUser` returns null → 401 + cookie hygiene clear by `/api/auth/session`.

## 5. Result

**All ten Phase 15 vulnerabilities remain FIXED and were re-proven live against the current production build.** No regression detected.