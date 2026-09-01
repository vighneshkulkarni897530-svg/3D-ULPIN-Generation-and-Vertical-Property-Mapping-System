# Authentication Setup & Architecture

**Project:** 3D ULPIN Generation and Vertical Property Mapping System (Smart Cadastre / Bhu-Verify prototype)
**Scope:** Login, registration, sessions, logout, password reset, RBAC compatibility, audit logging.

> This document describes the completed Login & Sign-Up phase, which preserves and
> completes the existing **Phase 10 authentication architecture** (scrypt password
> hashing + server-side session store + httpOnly cookies). **Supabase is NOT used in
> this project** — there is no Supabase dependency, no Supabase Auth and no Supabase
> database, so no second authentication system was introduced.

---

## 1. Architecture overview

```
Browser                          Next.js server (Node runtime)
────────                         ─────────────────────────────
AuthContext.tsx  ── fetch ──►  /api/auth/*  ──►  userStore (scrypt hashes, in-memory)
   │  (mirrors session            │                sessionStore (opaque 256-bit tokens, TTL)
   │   for UI only; the           │                passwordResetStore (hashed single-use tokens)
   │   httpOnly cookie is         └── requireAuth / requirePermission (API boundary)
   │   the real credential)            │
   └─ ProtectedRoute / RouteGuards     └── auditStore (append-only, in-memory)
Edge middleware (cookie presence gate → /auth/login?next=…)
```

- **Passwords** are never stored in plaintext: `scrypt` with a per-user random salt
  (`node:crypto`), verified with `timingSafeEqual`. Login for unknown emails still
  burns a hash to reduce timing-based account enumeration.
- **Sessions** are 256-bit cryptographically random opaque tokens stored **only** in
  an `httpOnly`, `SameSite=Lax` cookie (`spv_session`). Client JavaScript never sees
  the token. Sessions slide-expire (default **8 h**; **30 days** with "Remember me").
- **Authorization is always server-side.** Client-side checks (`permissions.ts`,
  `ProtectedRoute`) only shape the UI. Every API route re-validates the session and
  permission via `requireAuth` / `requirePermission`.

## 2. Login flow

`/auth/login` → `POST /api/auth/login { email, password, rememberMe? }`

1. Client validates email format + required fields (UX only).
2. Server rate-limits per IP+email (8 attempts / 5 min → `429`).
3. Credentials verified against the scrypt hash. Failures return the generic
   **“Invalid email or password.”** (`401 INVALID_CREDENTIALS`) — the response never
   reveals whether the account exists. Disabled accounts get `403 ACCOUNT_DISABLED`.
4. On success a session is created (`PASSWORD` auth method), the httpOnly cookie is
   set, and a `LOGIN` audit record is written. `rememberMe: true` extends the
   server-side session TTL to 30 days.
5. The page honours a safe same-origin `?next=<route>` target, otherwise routes by
   matched demo persona or `/dashboard`.

Demo access (prototype-only): the login page pre-fills the three seeded demo personas
and offers one-click demo sign-in via `POST /api/auth/demo-login`, which establishes a
**real** server session (`DEMO_FORM`). This endpoint must be removed in production.

## 3. Registration flow

`/auth/register` → `POST /api/auth/register { name, email, phone, password }`

- Fields: full name, email, mobile number (required by the existing data model),
  password + confirm; Aadhaar/Govt-ID is `PENDING-KYC` (placeholder, server-set).
- **Password policy** (`src/lib/auth/passwordPolicy.ts`, enforced server-side):
  minimum 8 characters, uppercase, lowercase, number, special character. The
  registration page shows a live checklist driven by the *same* pure module.
- **Role is always `CITIZEN`** — hardcoded in `userStore.registerUser()`. Any client
  supplied `role` value is ignored; there is no role selector in the UI.
- Duplicate emails → `400 EMAIL_TAKEN` with a friendly message.
- On success: account created (`ACTIVE`), `USER_CREATED` + `REGISTER` audit records,
  automatic sign-in (`REGISTRATION` session) and a visible success state.

## 4. Password reset flow

`/auth/forgot-password` → `POST /api/auth/forgot-password { email }`

- Response is **always generic** (`200 { ok: true, … }`) — no account enumeration.
- For known, ACTIVE accounts a **single-use, 15-minute reset token** is issued
  (32-byte random; stored SHA-256-hashed in `passwordResetStore`). Requests are
  rate-limited per email (3 / 15 min).
- `PASSWORD_RESET_REQUESTED` is audited (never the token itself).
- ⚠ **Development limitation:** no transactional email service is configured. In
  **non-production builds only**, the API returns `devResetToken` and the page shows
  it in a clearly-labelled “Development mode” panel with a direct link to the reset
  page. Production builds never return the token (email delivery would be required).

`/auth/reset-password?token=…` → `POST /api/auth/reset-password { token, password }`

- The token is consumed **before** validation (single-use even if expired), so a weak
  password cannot be retried against the same token.
- New password must satisfy the policy; success re-salts/re-hashes with scrypt,
  **destroys every existing session** for the account, audits
  `PASSWORD_RESET_COMPLETED`, and the page redirects to `/auth/login`.
- Invalid/expired tokens always return the same `400 INVALID_TOKEN` message with a
  path back to `/auth/forgot-password`.

## 5. Session lifecycle

| Event | Behaviour |
| --- | --- |
| Sign-in / registration | `createSession()` → 256-bit token in httpOnly cookie (`Secure` in production) |
| Page refresh / navigation | `GET /api/auth/session` restores the mirrored user in `AuthContext` (no localStorage) |
| Activity | Sliding expiry: each validated request extends the session (`8 h` or `30 d` TTL) |
| Expiry | Client watchdog refreshes near expiry → `401` → guarded pages redirect to `/auth/login?next=…` |
| Transient network failure | `refreshSession` retries (3 attempts) instead of forcing sign-out, preventing redirect ping-pong with the edge middleware |
| Logout | `POST /api/auth/logout` destroys the server session, clears the cookie (maxAge 0), audits `LOGOUT` |
| Password reset | All sessions for the account are destroyed server-side |

## 6. Roles & permissions (unchanged Phase 10 matrix)

| Role | Registration | Key capabilities |
| --- | --- | --- |
| CITIZEN | ✅ only self-service role | Registry browse, own dashboard/notifications, disputes, reports |
| OFFICER | ❌ provisioned administratively | Verification queue/updates, conflicts, workflow, field sheets |
| ADMIN | ❌ provisioned administratively | User management, audit log, system settings, admin dashboard |

Route protection: `ROUTE_RULES` in `src/lib/auth/permissions.ts` (single source of
truth) + edge middleware (cookie-presence gate) + `<ProtectedRoute>`/`<RoleGuard>` +
`requirePermission` at every API route. Unauthorised authenticated users are sent to
`/unauthorized`.

## 7. Environment variables

The prototype authentication stack requires **no** environment variables or secrets —
it is fully self-contained (in-memory stores). If a production identity provider or
email service is added later, keep credentials server-side only (e.g. `SMTP_URL`,
provider SDK keys) and never expose service-role keys to the browser. `.gitignore`
already excludes `.env*`, `*.pem`, `*.key` and local test artifacts (`cookies-*.txt`).

## 8. Security checklist

- ✅ No plaintext passwords; scrypt + per-user salt + timing-safe comparison
- ✅ No tokens/secrets in client JS (httpOnly cookie only)
- ✅ Generic auth errors (no account enumeration on login/forgot-password)
- ✅ Rate limiting: login (8/5 min per IP+email), reset requests (3/15 min per email)
- ✅ Reset tokens: 256-bit random, SHA-256-at-rest, single-use, 15-minute TTL
- ✅ Password reset invalidates all existing sessions
- ✅ No client-side role selection; server hardcodes `CITIZEN` at registration
- ✅ Open-redirect-safe `?next=` handling (same-origin paths only)
- ✅ Audit trail records `LOGIN`, `LOGIN_FAILED`, `LOGOUT`, `REGISTER`,
  `USER_CREATED`, `PASSWORD_RESET_REQUESTED`, `PASSWORD_RESET_COMPLETED` —
  never passwords, tokens or session secrets
- ✅ CSRF surface minimized: state-changing auth endpoints require a JSON body
  (`Content-Type: application/json`), the session cookie is `SameSite=Lax`
- ✅ Demo password is a published prototype credential (documented, not a secret)

## 9. Development setup & testing

```bash
npm install
npm run dev            # http://localhost:3000
npx tsc --noEmit       # type-check
npm run build          # production build
```

Manual test matrix (all verified for this phase):

1. Register a new citizen → success state → auto signed-in → dashboard
2. Refresh → session restored; visit a protected page directly → allowed
3. Logout (`/auth/logout` or user menu) → protected pages bounce to login
4. Wrong password → “Invalid email or password.”; unknown email → same message
5. Disabled account (admin disables via `/admin/users`) → 403 handling
6. ADMIN / OFFICER / CITIZEN logins all work with existing roles intact
7. Citizen visiting `/admin/users` → `/unauthorized`
8. Duplicate registration → friendly EMAIL_TAKEN message
9. Registering with a `role` field supplied by a raw client → ignored (CITIZEN)
10. Forgot password → token (dev panel) → reset with new password → old session dead

## 10. Production deployment notes & known limitations

- **In-memory stores** (users, sessions, audit, reset tokens) reset on server
  restart and are not shared across instances. Back `userStore`, `sessionStore`,
  `auditStore` and `passwordResetStore` with a database/Redis behind the same
  function signatures before production.
- **No email delivery**: reset links cannot be emailed yet (dev-only token panel).
- **Remove `/api/auth/demo-login`** and the login page demo panel before production.
- Add HTTPS termination (cookie `Secure` is automatic with `NODE_ENV=production`).
- Consider CAPTCHA on registration and a real mail service for password resets.