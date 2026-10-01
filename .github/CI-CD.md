# CI/CD pipeline

Everything runs on GitHub Actions. Deploys go to **Cloudflare Workers** (app, API, D1, KV, Queue)
and **Supabase** (edge functions, database).

```
 PR to main ─┬─ Lint (ratchet) ─────────┐
             ├─ Type-check + build ─────┤
             │   └ verify bundle        │
             │   └ wrangler --dry-run   ├─► CI gate  (the ONE required check)
             ├─ D1 migrations (local) ──┤
             ├─ Edge functions (deno) ──┤
             ├─ Supabase migration names┤
             ├─ Workflow lint ──────────┤
             └─ Dependency review ──────┘
             + PR title check, CodeQL, (optional) preview URL

 push to main ─► same gates ─► CI gate ─► Deploy (needs CD_ENABLED=true)
                                           1. D1 migrations (remote)
                                           2. wrangler deploy  (the artifact that passed CI)
                                           3. smoke test /api/health, /, /sw.js
                                           4. auto-rollback if the smoke test fails
 supabase/functions/** changed ─► deno check ─► deploy edge functions
```

## Workflows

| File | Trigger | What it does |
|---|---|---|
| `workflows/ci.yml` | PR + push to `main` | All quality gates; on `main` also deploys the Worker |
| `workflows/supabase.yml` | `supabase/functions/**` on `main`, or manual | Deploys edge functions; **manual-only** DB migrations (dry-run by default) |
| `workflows/rollback.yml` | manual | Roll the Worker back to the previous (or a chosen) version, then smoke-test |
| `workflows/preview.yml` | PR | Optional per-PR preview URL (**off by default**, see warning below) |
| `workflows/pr-title.yml` | PR | Enforces Conventional Commit titles (per `CONTRIBUTING.md`) |
| `workflows/codeql.yml` | PR, `main`, weekly | Static security analysis |
| `dependabot.yml` | weekly | Grouped npm updates + keeps the action SHA pins fresh |

All third-party actions are pinned to **commit SHAs** (with the version in a comment); Dependabot bumps them.

## One-time setup

### 1. Repository secrets  — *Settings → Secrets and variables → Actions → Secrets*

| Secret | Used by | Notes |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | deploy, rollback, preview | Create from the **"Edit Cloudflare Workers"** template, and add **D1: Edit** (needed for remote migrations). Scope to your account. |
| `CLOUDFLARE_ACCOUNT_ID` | deploy, rollback, preview | Dashboard → Workers & Pages → right sidebar |
| `SUPABASE_ACCESS_TOKEN` | supabase.yml | supabase.com → Account → Access Tokens |
| `SUPABASE_DB_PASSWORD` | supabase.yml (migrations only) | The project's database password |

**Worker runtime secrets are NOT stored in GitHub.** `TURNSTILE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`LETTERMINT_API_KEY` live in Cloudflare (`wrangler secret put <NAME>`). Deploys never touch them.

### 2. Repository variables — *…→ Variables*

| Variable | Required | Purpose |
|---|---|---|
| `CD_ENABLED` | to deploy | Set to `true` to turn on automatic deploys. **Leave unset until the secrets above exist** — otherwise merging this pipeline would try to deploy immediately. |
| `SUPABASE_PROJECT_ID` | for Supabase deploys | Project ref to deploy to. Intentionally explicit — see "Known issues". |
| `PRODUCTION_URL` | no | Defaults to `https://dvpyic.dpdns.org` (smoke-test target) |
| `VITE_TURNSTILE_SITE_KEY` | if the client uses Turnstile | Public site key baked into the client bundle |
| `VITE_SUPABASE_*` | no | Override the values taken from `wrangler.json` |
| `ENABLE_PR_PREVIEWS` | no | `true` enables `preview.yml` |

### 3. Environments — *Settings → Environments*

- **`production`** — add **Required reviewers** if you want a manual approval before every deploy / edge-function release.
- **`production-db`** — create it and add **Required reviewers**; every manual migration run waits for approval.

### 4. Branch protection — *Settings → Branches → `main`*

- Require a pull request before merging
- Require status checks: **`CI gate`** (and optionally `Conventional Commit title`)
- Require branches to be up to date

### 5. Security features — *Settings → Code security*

Enable Dependabot alerts + security updates, **secret scanning + push protection**, and the dependency graph
(needed by *Dependency review*).

## Why a few things look the way they do

**Public `VITE_*` values are injected at build time.** `.env` is gitignored and `wrangler.json → vars` only exist
at Worker *runtime*; Vite bakes `import.meta.env.VITE_*` into the bundle at *build* time. A bare `npm run build`
in CI produces a bundle with an empty Supabase URL/key. `scripts/ci/export-build-env.mjs` fills them from
`wrangler.json` (or repo variables), and `scripts/ci/verify-bundle.mjs` **fails the build** if they didn't land
in the output.

**Lint is a ratchet, not a hard gate.** The repo has 131 pre-existing ESLint errors. `scripts/ci/lint-ratchet.mjs`
fails a PR only if it *increases* the count above `.github/lint-baseline.json`. When you fix some, run
`node scripts/ci/lint-ratchet.mjs --update` and commit the lower number. At `0` it is a normal lint gate.

**`npm audit` is advisory.** There are pre-existing high/critical advisories in production deps (e.g. `maplibre-gl`).
New vulnerable dependencies *are* blocked on PRs by Dependency review. Remove `continue-on-error` on the `audit`
job once the backlog is cleared.

**Supabase migrations are manual.** They touch production data, and the repo has legacy duplicate version
prefixes (`20260213_*` ×9, `20260214_*` ×2). The CLI keys history on that prefix, so read the dry-run before applying.
CI blocks any *new* duplicates. Create new migrations with `supabase migration new <name>` (full timestamp).

**`wrangler deploy --keep-vars`** so a deploy can't delete plain-text vars that exist only in the dashboard.

**D1 migrations run before the code deploys**, so keep them additive. A rollback reverts code, not schema.

**PR previews share production bindings** (KV, D1, Queue, Supabase) — that's how Worker preview versions work.
Hence off by default and same-repo PRs only.

## Local equivalents

```bash
npm ci
node scripts/ci/lint-ratchet.mjs
node scripts/ci/export-build-env.mjs   # (in CI this writes to $GITHUB_ENV)
npm run build && node scripts/ci/verify-bundle.mjs
npx wrangler deploy --dry-run
bash scripts/ci/check-edge-functions.sh        # needs deno
node scripts/ci/check-supabase-migrations.mjs
```

## Known issues found while building this (fixed 2026-10-01, except #5)

1. ~~**Supabase project mismatch**~~ **Fixed** — production confirmed as `gtwqjuisdmbqlsjlatyj` (`.env`,
   `wrangler.json` vars, and the `ref` claim inside the publishable JWT all agree). `supabase/config.toml` and
   `.antigravitycli/settings.json` now point at it. Set the `SUPABASE_PROJECT_ID` repo variable to
   `gtwqjuisdmbqlsjlatyj`. (`worker-configuration.d.ts` still pins the old project in its `Env` literals —
   regenerate with `npm run cf-typegen` once dependencies are installed; types only, no runtime effect.)
2. ~~**Both `bun.lock` and `package-lock.json` are committed.**~~ **Fixed** — `bun.lock` removed (npm is canonical:
   `package-lock.json` + `npm ci` in CI; `bun.lock` was already deleted three times before and kept creeping back).
   `bun.lock` is now gitignored.
3. ~~**`bfg.jar` (14 MB), `git-filter-repo`, `temp_wrangler.json.backup` and `.git-rewrite/` are committed**~~ **Fixed** —
   removed from the tree and gitignored.
4. ~~**Two `001_*` D1 migrations**~~ **Fixed** — `001_drop_legacy_cache_tables.sql` renamed to
   `003_drop_legacy_cache_tables.sql` (pure rename; apply order is now `001 → 002 → 003`). Use unique numbers going forward.
5. If Cloudflare **Workers Builds** (Git integration) is also connected to this repo, disable it once `CD_ENABLED=true` to avoid double deploys.
