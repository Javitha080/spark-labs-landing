# Security & Health Audit — 2026-10-29

Scope: `dvpyic.dpdns.org` (Cloudflare Worker + Vite SPA + Supabase), live probes + source audit.

## Findings

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 1 | High | Production ran stale v0.2.0 — v0.3.0 hardening commit (CSP source-of-truth) was local-only (`main` ahead of origin); after push, CI was red on a pre-existing deno type-check break in `supabase/functions/innovation-chat` (dependency drift on `esm.sh/@supabase/*`) | ✅ Fixed — pushed + deno fix validated locally (`deno check` on all 10 functions) |
| 2 | Medium | `/api/*` gzip-encoded for `Accept-Encoding: identity` without `Content-Encoding` header → binary garbage for standard clients (`hono/compress`) | ✅ Fixed — `compress()` removed; CF edge handles gzip |
| 3 | Medium | `mailer_autoconfirm: true` + open signup → instantly "verified" accounts, no email proof | ⚠️ Open — toggle off in Supabase or gate student features |
| 4 | Medium | `/api/newsletter-subscribe`: no captcha → email bomb vector into admin inbox (cheap Turnstile fix blocked by dirty-tree Footer.tsx) | ✅ Mitigated — same-origin fence + 3/h limiter + fail-closed Turnstile-if-present. TODO: footer widget sends `X-Turnstile-Token` |
| 5 | Low | CSP dead origins (`maps.googleapis`, `cdn.jsdelivr`, `ai.gateway.lovable.dev`, `fonts.googleapis|gstatic`, `api.ipify*`, `api.lettermint.co`) + stale Google Fonts preconnect Link hints | ✅ Fixed — CSP trimmed, dead preconnects removed |
| 6 | Low | Bot prerender ships `s-maxage=600` + `Vary: User-Agent` (edge may cache bot HTML ~10 min) | ⚠️ Open — CF cache-behavior check post-deploy |
| 7 | Hygiene | ~45 files dirty (LiquidGlass refactor) + untracked dirs; when committed use `node scripts/ci/lint-ratchet.mjs --update` if lint blocks | ⚠️ Open |

## Verified Solid (evidence-based)

- **RLS**: anon + fresh-verified-session probes → `enrollment_submissions`, `student_accounts`, `user_roles`, `users_management`, `learning_*` all `*/0`. `students_insert_own` scoped to `auth.uid()`.
- **Admin API**: 401 unauthenticated on activities/schedule-write/cache-invalidate/upload/ig-oembed; permission-scoped cache invalidation (key allow-list).
- **Upload path**: RBAC per bucket, magic bytes, MIME→extension mapping, SVG banned.
- **CORS**: unknown origins get canonical origin echoed (browser-safe fallback); credentials-scoped allow-list.
- **SQL**: no string-built queries; PostgREST + parameterized D1 (`WHERE cache_key = ?`).
- **Verification of secrets posture**: `.env`/`.env.example`/`wrangler.json` checked — secrets only via `wrangler secret`; `.env.example` placeholder-only.
- **Wayback**: only public bundles archived.

## Residue from this audit

- Created account `audit-probe-20261029@example.org` (needs manual delete in Supabase dashboard).
- ~2 emails from probes hit `admin@dvpyic.dpdns.org` inbox.
- Recon bundles: `D:\Pentesting\rea\tmp\opencode\yic-recon\` (public assets only).

## Post-deploy verification

1. `GET /api/build-version` → `0.3.0`
2. CSP header → `wasm-unsafe-eval`, no `unsafe-eval`, no `fonts.googleapis`
3. `AE: identity` on `/api/build-version` → plain JSON (no `1F 8B` magic)
4. `POST /api/newsletter-subscribe` without Origin → 403
5. Playwright sweep of `/`, `/blog`, `/learning-hub` → no CSP violation console errors
