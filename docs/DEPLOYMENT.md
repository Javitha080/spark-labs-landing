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
| `VITE_TURNSTILE_SITE_KEY` | CI repo variable / `.env` | Optional — Cloudflare Turnstile widget |
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

### D1 migrations

```bash
wrangler d1 migrations apply edge-cache --remote   # production
wrangler d1 migrations apply edge-cache --local    # local dev (CI runs this)
```

Migration files live in `d1-migrations/`. Apply after schema-changing deploys; keep migrations backwards-compatible because rollbacks revert Worker code only, not D1/Supabase schema.

## Email delivery

Transactional email is sent by the Worker. Form submissions/enrollments enqueue an `EmailMessage` on `EMAIL_QUEUE`; the consumer (`src/worker/queues/email-consumer.ts`) delivers via the **Lettermint** API using the `LETTERMINT_API_KEY` Worker secret. Failures are retried by the queue with backoff; non-retryable failures (e.g. missing API key) are dropped after logging.

Templates: enrollment notifications (admin + student confirmation), contact form notifications (admin + sender confirmation), and custom admin messages from `/admin/notifications`.

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
