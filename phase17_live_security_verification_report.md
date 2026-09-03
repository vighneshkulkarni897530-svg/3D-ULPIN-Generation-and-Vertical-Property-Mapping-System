# PHASE 17 — LIVE SECURITY VERIFICATION REPORT

> Scope: re-run ALL Phase 15–16 attack vectors against the deployed `next start`
> production build (local production server, HTTP) to confirm no regressions.
> Tests performed over real HTTP (not static code inspection).

## Test Harness
- Production build: `npm run build` (PASS).
- Server: `next start` on HTTP :3100 (real production mode).
- Probe tool: real HTTP requests via `Invoke-WebRequest` with crafted cookies.

## Results Matrix

| # | Attack | Expected | Observed (HTTP) | Status |
|---|---|---|---|---|
| V1 | Forged spv_session (plain `{"access_token":"forged",...}`) | 401 | 401, no session | PASS |
| V2 | Modified userId in cookie | 401 | 401 | PASS |
| V3 | Modified email in cookie | 401 | 401 | PASS |
| V4 | Modified role in cookie | role ignored (server-authoritative) | role CITIZEN | PASS |
| V5 | Removed sig field | 401 | 401 | PASS |
| V6 | Invalid/bogus signature | 401 | 401 | PASS |
| V7 | Expired session (old expires_at) | 401 | 401 | PASS |
| V8 | Deleted user | 403/401 | rejected | PASS |
| V9 | Disabled user login | 403 | 403 | PASS |
| V10 | Client localStorage role=CITIZEN->ADMIN | no effect | role unchanged | PASS |
| V11 | Fake firebase_session_<uid> token | 401 | 401 (rejected) | PASS |
| V12 | Fake reg_session token | 401 | 401 (rejected) | PASS |
| V13 | Fake OTP claim (no/wrong-email/expired) | 401 | 401 | PASS |
| V14 | Forged cookie with valid payload but wrong sig | 401 | 401 | PASS |
| V15 | Open redirect ?next=https://evil.com | ignored | /dashboard | PASS |
| V16 | Unauth protected page | 307 -> login | 307 | PASS |
| V17 | Unauth protected API | 401 | 401 | PASS |
| V18 | Cross-role protected route | 403/redirect | verified | PASS |

## Detailed Evidence

### V1 — Forged unsigned cookie (server-side)
Cookie: `spv_session={"access_token":"forged","refresh_token":"legacy","expires_at":<far future>,"userId":"usr_admin_cadastre_gov_in","email":"admin.cadastre@gov.in"}`
- `GET /api/auth/session` → **401** (signature missing → `readSessionCookie`+`getSessionUser` returns null).
- `GET /api/users` → **401**.

### V11/V12 — Fabricated legacy tokens
- `POST /api/auth/firebase-login` with `idToken:"firebase_session_usr_x"` / `"reg_session_..."` → **401** "Invalid sign-in attempt."
- Confirmed the client-side `firebase_session_<uid>` fallback path in `AuthContext`
  can now never produce a session (it throws `NO_TOKEN` or the server rejects).

### V13 — OTP claim bypass
- `POST /api/auth/firebase-login` with `idToken:"otp_session_user@example.com"` and
  `claim:""` (or wrong email / expired payload) → **401**.
- Valid signed claim (created server-side at /api/auth/otp/verify) is the only thing accepted.

### V15 — Open redirect
- `?next=https://evil.com`, `?next=//evil.com`, `?next=javascript:alert(1)` →
  `login/page.tsx` regex rejects non-safe paths → falls back to `/dashboard`. Verified live.

### V16/V17 — Unauthenticated access
- 22 protected pages → **307 -> /auth/login?next=…**.
- 5 protected APIs → **401**.

### V18 — Cross-role
- CITIZEN → `/dashboard/officer`, `/admin/users`, `/government/dashboard` →
  redirect/unauthorized (live).
- OFFICER → `/admin/users`, `/admin/audit-log` → 403 (live).
- ADMIN/Cadastre → `/government/dashboard` → 200 (live).

## Conclusion
All Phase 15–16 vulnerabilities remain FIXED under a live production server.
No regression. Deployed-rules/Firebase/browser real-account tests remain
NOT VERIFIED — those require the live Firebase project and a browser.
