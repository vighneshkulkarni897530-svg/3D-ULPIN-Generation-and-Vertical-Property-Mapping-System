# PHASE 17 — DEPLOYMENT BLOCKER REPORT

> **Status: DEPLOYMENT NOT PERFORMED — AUTHORIZATION / ENVIRONMENT REQUIRED**

This report documents why BHU-VERIFY could not be deployed to the production
Firebase Hosting site (`ulpin-3d`, `d-ulpin-de274`) from this environment, and
what is required to unlock deployment.

## 1. Project Configuration Detected

| Artifact | Value |
|---|---|
| Hosting target (`firebase.json` → `hosting.site`) | `ulpin-3d` |
| Default project (`.firebaserc` → `projects.default`) | `d-ulpin-de274` |
| Firestore rules source | `firestore.rules` (already hardened) |
| Storage rules source | `storage.rules` (already hardened) |
| Client Firebase project (`NEXT_PUBLIC_FIREBASE_PROJECT_ID`) | `d-ulpin-de274` |

The intended production deployment target is **Firebase Hosting** for project
**`d-ulpin-de274`**, site **`ulpin-3d`** (the sub-domain
`https://ulpin-3d.web.app`).

## 2. Deployment Prerequisites Missing

A deployment from this environment is blocked because the following required
components are **absent**:

| Requirement | Present? | Notes |
|---|---|---|
| `firebase` CLI | **No** | `firebase --version` → not installed |
| `gcloud` CLI | **No** | `gcloud --version` → not installed |
| `vercel` CLI | **No** | `vercel --version` → not installed |
| Deploy credentials | **No** | No `FIREBASE_DEPLOY_TOKEN`, no `GCLOUD_SERVICE_KEY`, no `VERCEL_TOKEN` in the environment |
| Authorization to deploy | **Unknown** | No human operator authorized this workspace to perform production deploys |

> **Notably:** the absence of CLI tooling and credentials is an *environment*
> limitation, not a code defect. The application code, rules, and config are
> deployment-ready (see §3).

## 3. Code / Config Readiness (Local Production Build)

Although deployment is blocked, the **production build itself passes**, which
confirms the codebase is ready to deploy once credentials are supplied:

## 4. Remaining Deployment Blockers After Credentials Are Supplied

### 4.1 `SESSION_SECRET` (PHASE 16 — UNRESOLVED AT RUNTIME)
Phase 16 identified that `SESSION_SECRET` is **not set in the hosting
environment**. This is now a deployment-time requirement:

- `src/lib/auth/server/cookieSigner.ts` reads `process.env.SESSION_SECRET`.
- `src/lib/auth/server/sessionStore.ts` verifies the signed session cookie
  using that secret.
- If the secret is absent at deploy/serve time, `cookieSigner` falls back to a
  **documented prototype constant** (`'bhu-verify-cadastre-otp-hmac-secret-2024'`).

> ⚠️ **IMPORTANT:** Even though a prototype fallback keeps the app *functional*,
> a known/constant secret defeats the cryptographic integrity that Phase 15–16
> installed. **Production deployments MUST set a strong, random, server-only
> `SESSION_SECRET`.** With the fallback constant in place, the signed-cookie
> protection remains correct in *mechanism* but is only as strong as a secret
> that is documented in public source — so it MUST be overridden at deploy time.

A strong secret can be generated with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

`.env.example` has been updated to document this variable (it deliberately does
NOT contain a real value — the real value must be set in the hosting provider's
server-side environment / `.env.local`, never committed to Git).

### 4.2 Environment Variables That Must Be Provisioned

All `NEXT_PUBLIC_*` variables are already populated in `.env.example` and are
safe for browser exposure. The only **server-only** variable that must be
provisioned at deploy time is:

| Variable | Scope | Purpose |
|---|---|---|
| `SESSION_SECRET` | SERVER-ONLY | HMAC signing key for session cookies + OTP claims (cookieSigner, sessionStore) |

No Firebase Admin private key is imported into browser code (client SDK only).
See `phase17_final_production_verification_report.md` §4 for the full
classification.

## 5. What Deployment Would Look Like (Once Authorized)

If/when deploy credentials and authorization are provided:

1. Provision `SESSION_SECRET` (random 64-char base64) in the Firebase Hosting
   environment as a **server-only** variable (functions/`next start` env).
2. Authenticate the CLI: `firebase login:ci` (or use a service account key).
3. Deploy rules (read-only verification — rules are not weakened):
   ```bash
   firebase deploy --only firestore:rules,storage:rules --project d-ulpin-de274
   ```
4. Deploy hosting:
   ```bash
   firebase deploy --only hosting --project d-ulpin-de274
   ```
5. Then execute the post-deployment validation in
   `phase17_final_production_verification_report.md` §5–§12.

## 6. Decision

This environment has:
- ❌ No `firebase`/`gcloud`/`vercel` CLI installed.
- ❌ No deploy credentials or tokens.
- ❌ No explicit authorization to perform production deployment.
- ❌ No live production `SESSION_SECRET` set.

**Therefore deployment was NOT performed.** The codebase is structurally
ready to deploy; the blocker is purely operational (credentials + authorization).

---

**NEXT STEPS REQUIRED (owner/operator action):**
1. Provide deploy credentials + authorization to this environment, **or**
2. Run the deployment steps in §5 manually, setting a strong `SESSION_SECRET`,
   `NEXT_PUBLIC_SESSION_SECRET`, and `NEXT_PUBLIC_BYPASS_AUTH` (production: `false`),
   then proceed to §6–§12 of the final verification report.
