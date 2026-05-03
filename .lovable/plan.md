## Diagnosis

Most of the analysis you pasted is already addressed in the codebase. The remaining real bugs are narrow:

1. **Bot pre-rendering exists but never fires for the homepage.** `src/worker/prerender.ts` is wired up in `src/worker/index.ts`, but only inside the `if (response.status === 404)` branch (line 526). For `/`, `/about`, `/blog` etc., Cloudflare's static-assets fetcher returns `index.html` with **200**, so the bot-detection block is skipped and Googlebot still gets the empty `<div id="root"></div>`. This is the #1 reason the site isn't being indexed.
2. **No explicit HTTP→HTTPS redirect** in the Worker. CSP has `upgrade-insecure-requests` (which only helps inside an already-loaded HTML document) but bare `http://` requests reaching the Worker aren't 301'd to HTTPS, and Search Console is treating them as separate URLs.
3. **No canonical-host redirect.** If the site is reachable on multiple hostnames (e.g. `www.` vs apex, or the `.lovable.app` preview), search engines may split signals. Apply a 301 to the canonical `https://dvpyic.dpdns.org` for GET HTML requests.

Things in your analysis that are **already fine** and need no change:
- Anti-debug code is already a no-op (`src/lib/antiDebug.ts`) — it is not blocking crawlers.
- `sitemap.xml` and `robots.txt` exist and are well-formed.
- Static SEO meta tags + JSON-LD in `index.html` are good.

The dynamic-DNS domain remark (`dpdns.org`) is a real concern but isn't a code change — it's a domain decision for you to make.

## Changes

### 1. Always apply prerendering for bot GET requests on HTML routes
In `src/worker/index.ts` SPA handler, move the bot-detection block **above** the 404 check so it runs whenever a bot requests an HTML route — whether the asset hits or falls back. Detection logic:

- Method is GET/HEAD.
- `User-Agent` matches `isBot()`.
- Final response is HTML (path is `/`, ends with `/`, has no file extension, or response `Content-Type` starts with `text/html`).

Then call `injectPrerenderContent(response, pathname)` against the actual served HTML so bots receive real content for `/`, `/about`, `/projects`, `/blog`, `/events`, `/team`, `/gallery`, `/contact`, `/learning-hub`, `/privacy-policy`, `/terms-of-service`.

### 2. HTTP→HTTPS 301 in Worker
Add a top-level middleware (before all routes) that, when `new URL(c.req.url).protocol === 'http:'`, returns a 301 to the same URL with `https:`.

### 3. Canonical-host redirect (apex)
In the same middleware, if the request hostname is not `dvpyic.dpdns.org` and not `localhost` / `127.0.0.1` / `*.lovable.app` / `*.pages.dev` (preview environments), 301 the request to `https://dvpyic.dpdns.org<path><query>`.

### 4. Cache headers for bot HTML
When we inject prerender content, set `Cache-Control: public, max-age=300, s-maxage=600` and `Vary: User-Agent` so Cloudflare doesn't cache the bot variant for human users (and vice versa).

## Out of scope (not changing)

- Changing the domain away from `dpdns.org` — your call.
- Switching to full SSR (vite-plugin-ssr / Next). Pre-rendering for bots is enough for indexing.
- `prerender.io` integration — the in-house `prerender.ts` already covers all top-level routes.

## Files touched

- `src/worker/index.ts` — add HTTPS + canonical-host middleware; restructure SPA handler so bot pre-rendering runs on 200 responses too; add `Vary: User-Agent` to prerendered responses.

No new dependencies, no DB changes.