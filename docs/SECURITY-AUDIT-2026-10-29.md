# Security & Health Audit — 2026-10-29

Scope: `dvpyic.dpdns.org` (Cloudflare Worker + Vite SPA + Supabase), live probes + source audit.

## Findings

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 1 | High | Production ran stale v0.2.0 — root cause: CI/CD red for weeks (see #7), deploys drifted; after CI fix → **v0.3.0 deployed 2026-10-29 18:44 UTC, verified live** | ✅ Fixed & verified |
| 2 | Medium | `/api/*` gzip-encoded for `Accept-Encoding: identity` without `Content-Encoding` header → binary garbage for standard clients (`hono/compress`) | ✅ Fixed & verified live (identity → plain JSON) |
| 3 | Medium | `mailer_autoconfirm: true` + open signup → instantly "verified" accounts, no email proof | ⚠️ Open — one dashboard click: Supabase **→ Authentication → Providers → Email → "Confirm email" ON** (same toggle governs `mailer_autoconfirm`); no management token exists on this machine to script it |
| 4 | Medium | `/api/newsletter-subscribe`: no captcha → email bomb vector into admin inbox (cheap Turnstile fix blocked by dirty-tree Footer.tsx) | ✅ Mitigated & verified live — no-Origin → 403; same-origin + 3/h limiter counting; TODO: footer widget sends `X-Turnstile-Token` |
| 5 | Low | CSP dead origins (`maps.googleapis`, `cdn.jsdelivr` script/connection refs, `ai.gateway.lovable.dev`, `fonts.googleapis|gstatic`, `api.ipify*`, `api.lettermint.co`) + stale Google Fonts preconnect Link hints | ✅ Fixed & verified live — CSP trimmed, dead preconnects gone. NOTE: `cdn.jsdelivr.net` **kept in font-src** — HEAD's blog CSS loads OpenDyslexic font from there; uncommitted WIP self-hosts it under `public/fonts/` (make sure `public/fonts/OpenDyslexic-Regular.woff` is committed when the WIP lands, then the CDN entry can be re-dropped) |
| 6 | Low | Bot prerender ships `s-maxage=600` + `Vary: User-Agent` (edge may cache bot HTML ~10 min) | ✔️ Accepted-risk (deliberate): bots share freshly-prerendered public HTML ≤10 min, humans get `max-age=0, must-revalidate`, `Vary: User-Agent` keys caches per UA; no cross-audience bleed, content public |
| 7 | Deploy | CI/CD on `main` red for weeks: every run since ~Oct 12 fails — first `supabase/functions` deno type drift, and `@cloudflare/workerd-windows-64` pinned as a root dependency hard-fails Linux `npm ci` (`EBADPLATFORM`) — so auto-deploy was broken and prod drifted to stale v0.2.0 | ✅ Fixed — deno arrays cast validated (`deno check` ×10 green); Windows-only dep removed (workerd binaries come from wrangler→workerd metapackage optionals); lockfile synced |
| 8 | Hygiene | ~45 files dirty (LiquidGlass refactor) + untracked dirs; when committed use `node scripts/ci/lint-ratchet.mjs --update` if lint blocks | ⚠️ Open |

## Verified Solid (evidence-based)

- **RLS**: anon + fresh-verified-session probes → `enrollment_submissions`, `student_accounts`, `user_roles`, `users_management`, `learning_*` all `*/0`. `students_insert_own` scoped to `auth.uid()`.
- **Admin API**: 401 unauthenticated on activities/schedule-write/cache-invalidate/upload/ig-oembed; permission-scoped cache invalidation (key allow-list).
- **Upload path**: RBAC per bucket, magic bytes, MIME→extension mapping, SVG banned.
- **CORS**: unknown origins get canonical origin echoed (browser-safe fallback); credentials-scoped allow-list.
- **SQL**: no string-built queries; PostgREST + parameterized D1 (`WHERE cache_key = ?`).
- **Verification of secrets posture**: `.env`/`.env.example`/`wrangler.json` checked — secrets only via `wrangler secret`; `.env.example` placeholder-only.
- **Wayback**: only public bundles archived.

## Residue from this audit

- Probe account `audit-probe-20261029@example.org` — delete by running, from the repo root:
  PowerShell: `$env:SUPABASE_SERVICE_ROLE_KEY="<service_role secret from Supabase → Settings → API keys>"; node scripts/maintenance/delete-audit-probe.mjs`
  (also deletes nothing else; verifies residue rows tied to the user afterwards; exits 0 when already gone).
- ~2 emails from probes hit `admin@dvpyic.dpdns.org` inbox.
- Recon bundles: `D:\Pentesting\rea\tmp\opencode\yic-recon\` (public assets only).
- Footer Turnstile wiring (item 4) is intentionally deferred until the LiquidGlass WIP commit lands — `Footer.tsx` is a dirty WIP file the audit must not entangle; the worker side is already fail-closed and needs only the widget's `X-Turnstile-Token` header once it lands.

## Post-deploy verification — all passed 2026-10-29 ~18:45 UTC

1. ✅ `GET /api/build-version` → `0.3.0`
2. ✅ CSP header → `wasm-unsafe-eval`, no `unsafe-eval`; font-src keeps `cdn.jsdelivr.net` until OpenDyslexic woff is self-hosted in a commit
3. ✅ `AE: identity` on `/api/build-version` → plain JSON (no gzip magic)
4. ✅ `POST /api/newsletter-subscribe` without Origin → 403; with Origin + bad email → 400; limiter counting 3/h
5. ✅ Playwright sweep (fresh session) of `/`, `/blog`, `/learning-hub`, `/contact` → zero CSP violations / refusals / font errors
6. ✅ CI/CD green ×4 after the workerd pin fix — auto-deploy restored
