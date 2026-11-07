# Deployment & Operations

Single reference for deploying and operating the site: Cloudflare Workers (app + API + D1 + KV + Queue), Supabase (auth/database), admin CMS setup, and email delivery.

> CI/CD pipeline (GitHub Actions) is documented separately in [`.github/CI-CD.md`](../.github/CI-CD.md). Pushes to `main` that pass CI deploy automatically when `CD_ENABLED` is `true`; everything below also works manually.

## Architecture

```
┌────────────────────┐      ┌────────────────────┐
│  Static assets     │      │  Cloudflare        │
│  (React SPA)       │◄────►│  Worker (Hono)     │
│  dist/client       │      │  src/worker        │
└────────────────────┘      └────────────────────┘
          │                        │
          └────────┬───────────────┘
                   ▼
     ┌─────────────────────────────────┐
     │  Bindings: ASSETS, D1 (edge-    │
     │  cache), KV (rate limit), Queue │
     │  (email), Analytics Engine      │
     └─────────────────────────────────┘
```

One Worker serves both the SPA (static assets with SPA fallback) and the API (`/api/*`), deployed as a single `wrangler deploy`. The old Cloudflare Pages setup is retired (`npm run deploy:pages` still exists only as a legacy fallback).

## Commands

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server on :8080 with the Worker runtime simulated locally |
| `npm run build` | `tsc -b` + `vite build` → `dist/client/` + Worker bundle |
| `npm run check` | tsc + build + `wrangler deploy --dry-run` (full pre-deploy verification) |
| `npm run deploy` | Deploy the Worker to Cloudflare |
| `npm run cf-typegen` | Regenerate `worker-configuration.d.ts` after any `wrangler.json` change |

## Deploying

### Prerequisites

- Node 22 (see `.nvmrc` / `.node-version`).
- `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` in `.env` for manual deploys (or as GitHub secrets for CI). The token needs Workers Scripts:Edit plus KV/D1/Queue permissions for the bindings.
- Wrangler 4+.

### Manual deploy

```bash
npm run check      # types + build + wrangler deploy --dry-run
npm run deploy     # wrangler deploy
```

### CI/CD deploy (recommended)

Every push to `main` runs lint → typecheck/build → bundle verification → dry-run → D1 migration check → smoke test + auto-rollback. Deploys require the repo variable `CD_ENABLED=true` and the `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` secrets. Full details: [`.github/CI-CD.md`](../.github/CI-CD.md). Rollback is a one-click manual workflow (`.github/workflows/rollback.yml`).

### Custom domain

`wrangler.json` serves the Worker through the custom domain route only (`dvpyic.dpdns.org`); the `*.workers.dev` subdomain is disabled (`"workers_dev": false`) so there is only one indexable URL. Version URLs are disabled explicitly (`"preview_urls": false`) because this setting defaults to `workers_dev`, and `true` would publish every uploaded version at `<version>-spark-labs-landing.<account>.workers.dev` — a second public entry point running the same production bindings. The optional PR preview workflow needs both flags flipped back on (`ENABLE_PR_PREVIEWS=true` plus `preview_urls: true`) before its alias URLs resolve.

## Configuration

### wrangler.json

- **Keep it strict JSON** (no comments): `scripts/ci/export-build-env.mjs` and `verify-bundle.mjs` parse it with `JSON.parse`.
- `main: ./src/worker/index.ts`, `compatibility_date`, `nodejs_compat` flag.
- `assets`: `./dist/client`, binding `ASSETS`, `run_worker_first` for `/` and `/index.html`.
- Bindings: `RATE_LIMIT_KV` (KV), `CACHE_DB` (D1 `edge-cache`), `EMAIL_QUEUE` (Queue), `ANALYTICS` (Analytics Engine).
- `vars` holds **public only** values: `NODE_ENV`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Never put a secret here.

Any change to `wrangler.json` requires re-running `npm run cf-typegen`.

### Secrets & environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_SUPABASE_*` | `wrangler.json` vars / build env (CI repo variables) | Public client keys baked into the bundle |
| `VITE_TURNSTILE_SITE_KEY` | `wrangler.json` vars (public) / CI repo variable / `.env` | Public Cloudflare Turnstile widget key — must be present or all Turnstile widgets fail with "invalid sitekey" |
| `SUPABASE_SERVICE_ROLE_KEY` | `.dev.vars` (local) / `wrangler secret` (deployed) | Worker admin access, bypasses RLS — **never commit, never use the anon key** |
| `LETTERMINT_API_KEY` | `wrangler secret` | Transactional email (see Email section) |
| `TURNSTILE_SECRET_KEY` | `wrangler secret` | Server-side Turnstile verification |
| `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` | `.env` (local deploys) / GitHub secrets (CI) | Deployment credentials |

```bash
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put LETTERMINT_API_KEY
wrangler secret list
```

Build-time note: Vite bakes `import.meta.env.VITE_*` at build time. In CI, `scripts/ci/export-build-env.mjs` resolves those from repo variables or `wrangler.json` vars so a bare `npm run build` never ships empty keys.

### Database ownership constraint (current situation)

The production database is **Lovable-managed** (Supabase project `gtwqjuisdmbqlsjlatyj`); the operator holds no project ownership — only dashboard SQL-editor access. `SUPABASE_SERVICE_ROLE_KEY` is therefore **not deployed** (verify: `wrangler secret list`) and cannot be obtained. Consequences and mitigations, all shipped in the Worker (`src/worker/index.ts`, audit §10.3):

- `authMiddleware` runs in one of two modes. With a resolvable service key: legacy service-role behavior. Without: an RLS-native client that carries **the calling admin's JWT** — PostgREST enforces the same policies the browser CMS already passes. Nothing falls back to degraded data access; schedule CRUD, `/api/activities`, cache invalidation, IndexNow and enrollment email sends all work.
- The learning-notification email cron requires the service role (no user to impersonate) and simply logs each tick. The working drain path is **`POST /api/notify-emails/tick`** (learning_hub permission) and the automatic call after announcing/toggling an announcement in the Learning Hub admin.
- Requires the operator-applied migration `20261111000000_learning_notifications_admin_email.sql` (admin SELECT/UPDATE policies on `learning_notifications`).
- Optional: `20261112000000_student_account_email_preferences.sql` enables the per-student email opt-out on `/student/dashboard`. Pre-migration the drain warns once per run and fails open (everyone gets email as before).
- **If Lovable ever rotates the publishable key**, update `VITE_SUPABASE_PUBLISHABLE_KEY` in `wrangler.json` (+ CI build env) and redeploy — everything (public reads, browser CMS, Worker user-mode) rides that one key.

Fix the Turnstile secret naming independently of the DB issue:

```bash
wrangler secret put TURNSTILE_SECRET_KEY   # server-side verification key (currently missing)
wrangler secret delete TURNSTILE_SITE_KEY  # currently holds the PUBLIC key by mistake
```

### Self-hosting the database (available exit path)

Runbook when the DB should stop being Lovable-managed ( unlocks the service-role cron, `supabase gen types`, and full key control; no code changes — everything is env-driven):

1. Create a free Supabase project; keep its URL + publishable (anon) key.
2. Recreate the schema: paste every `supabase/migrations/*.sql` into the new project's SQL editor **in filename order** (all are re-runnable). Enable the extensions they reference if prompted (e.g. `pgcrypto`).
3. Copy data from the Lovable project's SQL editor: `SELECT * FROM <table>` per table → save as CSV/inserts → load into the new project. The SQL editor runs as the `postgres` role, so `auth.users` is readable there too — copy via the official batch including `crypt(...)`/bcrypt `encrypted_password` inserts so student logins keep working. Copy `user_roles`, `users_management`, `roles`, `enrollment_submissions`, and learning tables in the same pass.
4. Swap env: `VITE_SUPABASE_URL` + `VITE_SUPABASE_PROJECT_ID` + `VITE_SUPABASE_PUBLISHABLE_KEY` in `wrangler.json` and the CI build env; then `wrangler secret put SUPABASE_SERVICE_ROLE_KEY` (now the owner of the key).
5. Redeploy; run the SQL-editor probes used in phase 3 to verify; keep a short cutover window where content edits are frozen (writes during the copy would be stranded).

### D1 migrations

```bash
wrangler d1 migrations apply edge-cache --remote   # production
wrangler d1 migrations apply edge-cache --local    # local dev (CI runs this)
```

Migration files live in `d1-migrations/`. Apply after schema-changing deploys; keep migrations backwards-compatible because rollbacks revert Worker code only, not D1/Supabase schema.

## Email delivery

Transactional email is sent by the Worker. Form submissions/enrollments enqueue an `EmailMessage` on `EMAIL_QUEUE`; the consumer (`src/worker/queues/email-consumer.ts`) delivers via the **Lettermint** API (`https://api.lettermint.co/v1/send`) using the `LETTERMINT_API_KEY` Worker secret. Failures are retried by the queue with backoff; anything already failing on config (`429`/`5xx` stay retryable) is *parked*, not acked: a missing/rotated key (401/403) or an exhausted retry cap dead-letters the message instead of silently dropping mail. Templates: enrollment notifications (admin + student confirmation), contact form notifications (admin + sender confirmation), and custom admin messages from `/admin/notifications`.

### Route pinning (do not remove)

Every send body includes `route: "outgoing"` (`LETERMINT_TRANSACTIONAL_ROUTE` in the consumer). Without it Lettermint uses the project's **default route**, which in the YICDVP project had been the **broadcast** route — wrong cargo class for one-to-one notifications and the route where a `hard_bounce` suppression for the admin alias was parked (it silently ate alias mail for months). All delivery events for the incident-mail path (bounces/complaints/deliveries) now arrive via the webhook below; the Lettermint dashboard remains the audit trail.

Route/suppression semantics worth remembering (provider doc: "Routes · Suppression lists"): a route-scoped suppression on the *broadcast* route only blocks *broadcast* mail; one on a *transactional* route blocks all mail on that route. Suppressed recipients get status `suppressed` (not `hard_bounced`) — a hard bounce always means a real delivery attempt happened.

### Delivery-events webhook (`POST /api/lettermint/webhook`)

Lettermint pushes bounce/complaint/suppression events to the Worker so failures are visible in Workers Logs + Analytics Engine (blob layout: `email_event, event, reason, reason_code, status_code, sandbox` — no recipient PII; the log line carries it).

- **Secret:** `LETTERMINT_WEBHOOK_SECRET` (Worker secret) — the signing secret of the "YICDVP worker events" webhook in the Lettermint dashboard. Missing secret → endpoint answers `503` and logs an error.
- **Verification:** Stripe/Svix scheme (`X-Lettermint-Signature: t=<unix>,v1=<hmac>`, `X-Lettermint-Delivery` must equal `t`, ≤300 s tolerance) via `verifyLettermintSignature` in `src/worker/webhooks/lettermint.ts` — timing-safe compare, raw-body-only hashing.
- **Response contract:** invalid signature → `401` (provider does not retry it); valid event → `200` after `logEmailEvent` + `recordEmailEvent`. Errors inside either path never block the `200`.

### Supabase storage of newsletter subscribers

`POST /api/newsletter-subscribe` persists the (validated, lowercased) address into `public.newsletter_subscribers` **before** queuing the admin notification — a bounced notification can no longer lose a subscription (`stored: true|false` in the response).

**Write path — SECURITY DEFINER RPC, not a direct table upsert.** This production Worker has **no `SUPABASE_SERVICE_ROLE_KEY`** (externally managed DB, audit §10.3), so unauthenticated-route writes run under the publishable/anon role. Migrations:

- `supabase/migrations/20261113000000_newsletter_subscribers.sql` — table, unique email index, RLS-on with zero policies + `REVOKE ALL ... FROM anon, authenticated`, `updated_at` trigger. Hand-apply in the SQL editor, re-runnable. The `REVOKE`s deliberately lock every role out of direct table access.
- `supabase/migrations/20261114000000_newsletter_subscribe_rpc.sql` — `insert_newsletter_subscriber(p_email, p_source) RETURNS boolean`, the single anon-callable write surface: `SECURITY DEFINER SET search_path = public`, re-validates the email (same regex/length as the Worker, because the RPC also stays callable straight through PostgREST), clamps `p_source`, re-vokes `PUBLIC` EXECUTE, and grants `EXECUTE` only to `anon`/`authenticated`/`service_role`. Hand-apply after the first migration, re-runnable.

**Client construction matters as much as the schema.** The route builds its DB client with `getPublicSupabase` (publishable key, RLS-governed — the identity a browser visitor has; the helper public read endpoints already use). It cannot use `getSupabase`: with no `SUPABASE_SERVICE_ROLE_KEY` on this production that helper *refuses to construct*, and the route's catch used to turn the throw into a permanent `stored:false` — no migration can fix a client that never runs. Audit §10.5 documents the live finding.


### Incident: Nov 5 admin-alias hard bounce (trace `TjZbBKxdOMtA`)

The Nov 5 newsletter notification to `admin@dvpyic.dpdns.org` hard-bounced `521 5.3.0 (upstream error)` at the Cloudflare Email Routing → Gmail forwarding hop, 7 s after accept. Differential repro on 2026-11-07 (post suppress-clearing, route pinning):

- Lettermint → `javithasenon1@gmail.com` (direct Gmail): **delivered** (250).
- Lettermint → `javitha679@gmail.com` (direct Gmail): **delivered** (250).
- Lettermint → `admin@dvpyic.dpdns.org` (CF Email Routing forward to Gmail): **delivered** (250).

Category: one-off transient upstream SMTP error; configuration clean end-to-end (MX/SPF/DKIM/DMARC records, CF rules, verified destinations). The consumer-side failure modes it exposed were real though: silent-ack on 401 (fixed → DLQ), no webhook visibility (fixed → this webhook), and the hard_bounce suppression parked on the broadcast route that filter had silently eaten alias mail with (fixed: removed + route pinning makes it moot). Note the blacklist factor: the suppression was created **May 23** by an earlier hard bounce, and as a broadcast-route entry it silently skipped only broadcast-class mail — the Nov 5 send itself was attempted (status `hard_bounced`, not `suppressed`), so the two are related but the 521 itself was upstream, not the suppression. **Escalation path if it ever reproduces:** check the message's `list_message_events` timeline in Lettermint first; `5.3.0`/`5.2.1`-class upstream errors point at the CF↔Gmail hop (CF postmaster docs relay upstream SMTP codes in-session); a recurrence pattern across days/addresses warrants a Cloudflare Email Routing support case + moving the `admin@` rule's destination to a non-Gmail address.

> Legacy: `supabase/functions/send-*` edge functions and the old Cloudflare Email Routing token flow predate this pipeline and are kept only for reference; the Worker queue + Lettermint is the live path.

## Admin (CMS) setup

No public signup — admins are Supabase Auth users granted one of the 4 CMS roles. Students authenticate separately via `StudentAuthContext` (`student_accounts`) and never get CMS roles.

### Roles (`src/lib/rbac.ts`)

| Role | Permissions |
|------|-------------|
| `admin` | `all` — user management, role assignment, everything |
| `editor` | `home`, `events`, `team`, `schedule`, `projects`, `gallery`, `blog`, `learning_hub` |
| `content_creator` | `blog`, `gallery`, `projects`, `learning_hub` |
| `coordinator` | `events`, `enrollments`, `schedule`, `notifications`, `learning_hub` |

Any authenticated user *without* one of these roles in `public.user_roles` gets no CMS access.

### Adding a CMS user

1. **Supabase Dashboard → Authentication → Users → Add User** (set email + strong password), copy the generated UUID.
2. Grant the role:

   ```sql
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('123e4567-e89b-12d3-a456-426614174000', 'admin');
   ```

3. The user can log in at `/admin/login`.

### Verifying / revoking access

```sql
-- List CMS users
SELECT ur.role, p.email, p.full_name
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role IN ('admin', 'editor', 'content_creator', 'coordinator');

-- Revoke
DELETE FROM public.user_roles
WHERE user_id = 'USER_ID_HERE' AND role = 'admin';
```

Security posture: roles are verified server-side (Worker middleware checks the Supabase JWT against `user_roles`/`ROLE_PERMISSIONS`; Postgres RLS uses `is_admin(auth.uid())` / `is_content_admin(auth.uid())`). Admin status cannot be manipulated client-side, and students are isolated from CMS roles.

## Troubleshooting

- **TypeScript errors in the Worker** → re-run `npm run cf-typegen` after config changes.
- **API routes 404** → routes must start with `/api/`; anything else is handled as an asset (see `run_worker_first` for `/` and `/index.html`).
- **Empty Supabase keys in the bundle** → the build env wasn't exported; locally `.env`/`wrangler.json` vars provide them, in CI check the repo variables and `scripts/ci/export-build-env.mjs`.
- **FormData hangs → 504** → Worker routes must use `c.req.raw.formData()` (`parseBody()` consumes the stream and returns a plain Record).
- **Uploads blocked cross-origin** → never set a `Cross-Origin-Embedder-Policy` header in the Worker (it breaks Supabase storage uploads).
- **`wrangler.json` parse errors in CI** → the file must stay strict JSON; comments break `export-build-env.mjs`.

## Resources

- [Cloudflare Workers docs](https://developers.cloudflare.com/workers/)
- [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/)
- [Hono framework](https://hono.dev/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [Supabase docs](https://supabase.com/docs)
