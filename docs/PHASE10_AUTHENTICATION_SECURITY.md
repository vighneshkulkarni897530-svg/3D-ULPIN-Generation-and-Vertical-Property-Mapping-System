# Phase 10 — Authentication, Role-Based Access Control & Security

> **PROTOTYPE AUTHENTICATION NOTICE**
> This phase adds **real, working** authentication, sessions, RBAC and audit
> logging to the prototype — but the backing stores are **in-memory and
> server-process-local** (users, sessions and audit records reset when the
> Next.js server restarts). This is **NOT production-grade security
> infrastructure**. See [Prototype vs Production](#prototype-vs-production).

---

## 1. Authentication Architecture

```
Browser                              Next.js server
────────                             ──────────────
/auth/login ──POST /api/auth/login──▶ checkCredentials()
  (email + password)                   ├─ scrypt hash verify (node:crypto)
                                       ├─ rate limit (8 attempts / 5 min / IP+email)
                                       ├─ appendAudit(LOGIN | LOGIN_FAILED)
                                       └─ createSession() → 256-bit opaque token
                                            └─ Set-Cookie: spv_session
                                               (httpOnly, SameSite=Lax, secure in prod)

AuthContext (client) ──GET /api/auth/session──▶ getSessionUser(req)
  - bootstraps once on app load                    ├─ validates + slides expiry (8h)
  - mirrors user + expiry for UI                   └─ returns PUBLIC user projection
  - session-expiry watchdog (auto re-sync)
  - NEVER stores tokens in JS (cookie is httpOnly)
```

### Routes added

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /api/auth/login` | public | Credential sign-in → session cookie |
| `POST /api/auth/register` | public | CITIZEN self-registration (auto sign-in) |
| `POST /api/auth/demo-login` | public | **Prototype-only** instant demo persona sign-in |
| `POST /api/auth/logout` | any | Destroys server session, clears cookie, audits |
| `GET /api/auth/session` | any | Current session user + expiry (401 when signed out) |
| `GET /api/users` | ADMIN | List accounts (`/admin/users`) |
| `GET /api/users/:id` | ADMIN | Account details |
| `PATCH /api/users/:id` | ADMIN | Role change / enable-disable (audited) |
| `GET /api/audit-log` | ADMIN | Query audit trail (filters: `action`, `entityType`, `limit`) |
| `POST /api/audit-log` | authenticated | Report a real domain action (server stamps actor) |

### Client infrastructure (`src/lib/auth/`, `src/context/AuthContext.tsx`, `src/components/auth/`)

- `permissions.ts` — pure single-source-of-truth: role hierarchy,
  `hasPermission`, route→permission map (`canAccessPath`, `getRouteRule`),
  the rendered permission matrix.
- `client.ts` — typed fetch wrappers with normalized `AuthApiError`
  (status 400/401/403/429 preserved) and `reportAudit` (fire-and-forget).
- `AuthContext` — `useAuth()` exposes `sessionUser`, `authStatus`
  (`initializing | authenticated | unauthenticated`), `isAuthenticated`,
  `role`, `login`, `register`, `demoLoginAs`, `logout`, `hasPermission`,
  `canAccessPath`, `refreshSession`. Legacy API (`currentUser`, `setRole`,
  `loginAs`) is preserved; the legacy persona switch now establishes a
  **real server demo session** instead of a localStorage flag.
- `ProtectedRoute` / `RouteGuards` — declarative page protection
  (unauthenticated → `/auth/login?next=…`, unauthorized → `/unauthorized?next=…`).
- `UserMenu` — navbar user menu (avatar, role badge, profile link, logout).
- `FullScreenLoader` — shared auth-boot loading state.

## 2. User Roles

Exactly three roles, defined in `src/types/auth.ts` and displayed via
`ROLE_LABELS` (`src/lib/auth/permissions.ts`):

- **CITIZEN** — browse the GIS registry (parcels/buildings/floors/units), 3D
  map, verification status, conflicts, workflow, notifications, reports;
  submit disputes; request field verification.
- **OFFICER** — everything CITIZEN has, plus verification queue/updates,
  field verification sheets, AI spatial extraction, conflict management,
  workflow management, officer dashboard.
- **ADMIN** — everything OFFICER has, plus user management, audit log,
  admin dashboard, system settings/administration.

## 3. Permission Matrix

Authoritative source: `ROLE_PERMISSIONS` in `src/types/auth.ts`; rendered
from `PERMISSION_MATRIX` in `src/lib/auth/permissions.ts`.

| Feature | Citizen | Officer | Admin |
|---|:---:|:---:|:---:|
| Property / Registry View | ✓ | ✓ | ✓ |
| 3D Map | ✓ | ✓ | ✓ |
| Building & Floor View | ✓ | ✓ | ✓ |
| Verification Status View | ✓ | ✓ | ✓ |
| Verification Update | ✗ | ✓ | ✓ |
| Conflict View | ✓ | ✓ | ✓ |
| Conflict Management | ✗ | ✓ | ✓ |
| Workflow View | ✓ | ✓ | ✓ |
| Workflow Management | ✗ | ✓ | ✓ |
| Reports & Analytics | ✓ | ✓ | ✓ |
| User Management | ✗ | ✗ | ✓ |
| Audit Logs | ✗ | ✗ | ✓ |
| System Administration | ✗ | ✗ | ✓ |

## 4. Protected Routes

Route rules live in `ROUTE_RULES` (`src/lib/auth/permissions.ts`) and are
enforced in **two layers**:

1. **Request proxy** (`src/proxy.ts`) — cheap cookie-presence gate:
   unauthenticated requests to protected pages are redirected to
   `/auth/login?next=…`; public paths (`/`, `/auth/*`, `/unauthorized`) pass
      through. (Proxy cannot reach the in-memory session store, so the
   authoritative check is #2.)
2. **Page-level `ProtectedRoute`** — every protected page validates the real
   session via `AuthContext` (server-backed) and the permission map, then
   renders the unauthorized state (→ `/unauthorized?next=…`) on 403.

| Area | Minimum role |
|---|---|
| `/dashboard`, `/properties`, `/buildings`, `/floors`, `/map`, `/conflicts`, `/workflow`, `/disputes/*`, `/field-verification/*` | any authenticated |
| `/notifications` | any authenticated (own notifications) |
| `/reports` | any authenticated |
| `/verification`, `/verification/field` | OFFICER+ |
| `/ai-extraction` | OFFICER+ |
| `/dashboard/officer` | OFFICER+ |
| `/dashboard/admin`, `/admin/*`, `/settings` | ADMIN |
| `/profile` | any authenticated |
| `/unauthorized`, `/auth/*`, `/` | public |

## 5. Security Architecture

- **Passwords**: scrypt-hashed (64-byte key, 16-byte random salt per user,
  `node:crypto.timingSafeEqual` comparison). Plaintext never stored or logged.
- **Sessions**: 256-bit random opaque tokens kept **only** server-side; the
  browser receives an `httpOnly`, `SameSite=Lax` cookie (`secure` in
  production) and can never read the token. Sliding 8-hour expiry.
- **Authorization boundary**: every sensitive API route funnels through
  `requireAuth` / `requirePermission` (`src/lib/auth/server/apiAuth.ts`),
  which resolves the role **from the server session** — role values in
  request bodies/headers are ignored by design. Status codes: **401**
  unauthenticated, **403** authenticated-but-unauthorized, **400** invalid
  request, **429** rate-limited, **404** unknown resource.
- **Input validation**: dependency-free validators (`readJsonBody` with a
  20 KB cap, `requireString`, `optionalString`) on every endpoint; audit
  fields are length-capped and only allowlisted actions/entity types pass.
- **Login brute-force protection**: 8 attempts / 5 minutes per IP+email.
- **Security headers** (`next.config.js`): `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`,
  and `X-Powered-By` removal.
- **Secrets**: no hardcoded passwords, keys, tokens or credentials; `.env*`
  files are git-ignored; no server secrets exist in client bundles (the only
  "secret-looking" string, `DEMO_PASSWORD`, is an intentionally **published**
  demo credential rendered on the login page and clearly labelled).

## 6. Audit Logging

Server store: `src/lib/auth/server/auditStore.ts` (in-memory ring buffer,
max 500 records, newest first; **no fake historical records are seeded** —
only actions actually performed are recorded).

Record shape: `actor (id/name/role, stamped server-side from the session)` ·
`action` · `entityType` · `entityId` · `timestamp` · `previousValue` ·
`newValue` · `details` · masked IP (`10.x.x.x` style).

Recorded actions:

| Source | Actions |
|---|---|
| Auth API | `LOGIN`, `LOGIN_FAILED`, `LOGOUT`, `REGISTER`, `USER_CREATED` |
| User management API | `USER_ROLE_CHANGE`, `USER_STATUS_CHANGE` (with previous → new values) |
| GISContext (client-reported) | `PROPERTY_UPDATED`, `VERIFICATION_UPDATED`, `CONFLICT_UPDATED` |
| WorkflowContext (client-reported) | `WORKFLOW_ACTION` (create/assign/status/complete/note) |
| Citizen services | `DISPUTE_SUBMITTED`, `FIELD_VERIFICATION_REQUESTED` |

Client reporting uses `reportAudit()` (fire-and-forget; audit failures never
break the primary action) and the server overwrites any client-supplied
actor with the session identity.

## 7. Storage / Database

**No production database exists in this project** (Phases 1–9 use in-browser
mock registries, which are untouched). Phase 10 therefore introduces a clean
abstraction with clearly-labelled in-memory implementations:

- `src/lib/auth/server/userStore.ts` — users + scrypt credentials
  (**prototype-only**; registered accounts reset on server restart)
- `src/lib/auth/server/sessionStore.ts` — sessions (**prototype-only**)
- `src/lib/auth/server/auditStore.ts` — audit records (**prototype-only**)

A production deployment swaps these three modules for database-backed
implementations behind the same exported signatures. The existing GIS
registry (`src/data/*`, `GISContext`) is **not** duplicated or modified.

## 8. Prototype vs Production

| Concern | This prototype | Production requirement |
|---|---|---|
| User storage | In-memory (resets on restart) | Database + migrations |
| Sessions | In-memory Map | Redis/DB-backed, rotation, revocation |
| `/api/auth/demo-login` | Enabled for evaluation | **Must be removed** |
| Registration | Instant citizen account | Email/OTP verification, KYC |
| Audit store | In-memory ring buffer (500) | Append-only DB table / log sink |
| Rate limiting | Per-process counter | Distributed limiter (e.g. Redis) |
| Identity | Own credential store | SSO / IdP (e.g. DigiLocker, OIDC) |
| Middleware gate | Cookie presence only | Edge-verifiable session (signed JWT / DB lookup) |

## 9. Current Limitations

1. **Server restart resets users, sessions and audit history** (in-memory stores).
2. Sessions do not survive serverless instance recycling — a long-lived
   Node server (e.g. `next start`) is required for sessions to work.
3. The navbar **Role Switcher** remains as a demo affordance: it now creates
   real demo sessions, but in production role switching must be an
   administrator action (kept for evaluator convenience).
4. Audit records are capped at 500 with no export.
5. No password reset / email verification flow (no mail service in prototype).
6. CSP is not enforced (only basic security headers) — a strict CSP requires
   asset nonce plumbing across the existing app and was deliberately deferred
   to avoid regressing Phases 1–9.
