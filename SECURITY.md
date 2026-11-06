# Security Policy

## Reporting a Vulnerability

**Please use GitHub's Private Vulnerability Reporting** (Security tab → "Report a vulnerability") on this repository. It is enabled and keeps your report confidential while we work on a fix.

Do **not** open a public GitHub Issue for anything you believe is a security problem — that applies especially to auth bypasses, RLS/data exposure, leaked secrets, or XSS.

If private reporting is not available to you, contact the maintainer directly and ask for a private channel before disclosing details.

## What to Include

To help us triage quickly, please include:

- A short description of the issue and its impact
- Step-by-step reproduction (URL, request, payload)
- Affected component if you know it: Worker API (`src/worker/`), frontend pages, Supabase schema/RLS (`supabase/migrations/`), D1 (`d1-migrations/`), build/deploy pipelines
- Any logs, screenshots, or proof-of-concept
- Your contact / GitHub handle for follow-up

## Response Timeline

We aim to:

1. **Acknowledge** the report within **72 hours**
2. **Triage** and communicate severity within **7 days**
3. **Ship a fix** targeting **30 days** for high-severity issues (faster for actively exploited or secret-leak cases)
4. **Disclose** publicly via a GitHub Security Advisory once a fix is deployed, crediting the reporter if they wish

## Scope — In Scope

- The Cloudflare Worker (`src/worker/index.ts` and related modules): API endpoints, rate limiting, email queue handling, prerender/SEO logic
- Authorization and multi-tenancy: admin (`RoleContext` RBAC) vs. student (`StudentAuthContext`) separation, RLS policies enforced by the database
- Authentication flows via Supabase Auth and session handling in `src/integrations/supabase/` and `src/context/`
- Content Security Policy defined in `src/lib/cspPolicy.ts` (please check your findings against it)
- The deployed site `dvpyic.dpdns.org` and any subdomains serving this application

## Scope — Out of Scope

Reports unrelated to security will be closed, including:

- Self-XSS or issues requiring an attacker to control the victim's own account state
- Reports from automated scanners without a working proof-of-concept
- Missing HTTP security headers on third-party origins (including Supabase/Cloudflare-managed pages)
- Rate limiting or CAPTCHA (Turnstile) bypasses that require dedicated, non-trivial infrastructure
- Spam, brute force, or DDoS attacks
- Physical or social-engineering attacks on staff or users
- Vulnerabilities in unpatched third-party dependencies when a patched version exists — please open a normal issue linking the advisory for those, or a Dependabot report is welcome

## Secret Leaks

If you find or have reason to believe any secret was exposed (Supabase keys, Cloudflare tokens, `SUPABASE_SERVICE_ROLE_KEY`, `LETERMINT_API_KEY`, `TURNSTILE_SECRET_KEY`):

1. **Report it privately immediately** — do not share the value in public
2. We will rotate the secret and invalidate any sessions/keys affected

Note: `.env`, `.env.*`, and `.dev.vars` are gitignored on purpose; the publishable/anon keys shipped in `wrangler.json` `vars` and client code are intentionally public and not vulnerabilities.

## Safe Harbor

We will consider research activity against this project to be authorized, will not pursue legal action against good-faith reporters, and will work with you to understand and resolve the issue — provided you:

- Use the vulnerability only to demonstrate the issue, not to access, modify, or degrade real user data
- Stop and report immediately upon discovering a working exploit
- Make a good-faith effort to avoid privacy violations, data destruction, and degraded service availability

## Supported Versions

This project deploys continuously — pushes to `main` are built and deployed to Cloudflare Workers automatically. Security fixes are therefore applied to the **latest deployment only**; we do not maintain older release branches.

| Version | Supported |
| --- | --- |
| latest `main` deploy | ✅ |
| older deployments | ❌ (auto-rolled forward) |

## Security-Related Conventions in This Repo

Useful context if you are contributing fixes here:

- CSP is generated from a single source: `src/lib/cspPolicy.ts` (Worker, `src/lib/security.ts`, and dev server all consume it). Scan for drift before starting work.
- The Worker must use `SUPABASE_SERVICE_ROLE_KEY` only for admin-bypass operations server-side; the anon key is used for client calls subject to RLS.
- Do not set `Cross-Origin-Embedder-Policy` in the Worker — it breaks cross-origin Supabase storage uploads.
- Admin routing goes through `getCMSLandingPath(role)` in `src/lib/rbac.ts`; permission maps must stay in sync with the sidebar navigation.
