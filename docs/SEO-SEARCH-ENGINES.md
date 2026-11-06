# SEO & Search Engine Operations Guide (YICDVP)

**Goal:** for a search of `yicdvp`, `dharmapala vidyalaya pannipitiya`,
`dharmapala vidyalaya pannipitiya young innovations club`,
`dharmapala vidyalaya pannipitiya clubs` (and close misspellings) to return
this website top-of-results on Google, Bing/Yahoo, DuckDuckGo, Yandex, Safari/
Apple, and AI search assistants.

This doc maps **what is implemented in the codebase** and **what you must do
once in each webmaster console**. Last updated: 2026-11-06.

---

## 1. What is implemented (do not re-do these)

| Area | Status | Where |
|---|---|---|
| Per-route title/description/canonical keywords ("Dharmapala Vidyalaya Pannipitiya" in the homepage title) | ✅ | `src/worker/prerender.ts` (`PAGE_META`) |
| Bot prerender for every fixed page (real HTML, no JS needed) | ✅ | `src/worker/prerender.ts` (`PAGES`) |
| **NEW: per-post prerender for `/blog/:slug`** — every published post now serves its own title, description, canonical, article OG tags, cover image, and BlogPosting + Breadcrumb JSON-LD to JS-less crawlers (Bing, Yandex, Facebook, LinkedIn, WhatsApp…) | ✅ | `src/worker/prerender.ts` (`injectBlogPostPrerender`), loader in `src/worker/index.ts` (`loadBlogPostSeoMeta`) |
| **NEW: IndexNow instant-indexing integration** — key generated, key file deployed, auto-submit of the 10 newest posts on every admin blog publish/cache purge, plus a manual admin endpoint | ✅ | `public/indexnow-*.txt`, `src/worker/index.ts` (`/api/indexnow`), `wrangler.json` (`INDEXNOW_KEY`) |
| **NEW: webmaster verification tags** — injected into `/` from env vars when set | ✅ (needs your tokens) | `src/worker/index.ts` (`buildSearchEngineVerificationTags`) |
| **NEW: branded 1200×630 OG banner** replaces the 512² logo in social previews | ✅ | `public/assets/og-yicdvp-banner.png`, regenerable via `node scripts/build-og-banner.mjs` |
| Organization JSON-LD with real `sameAs` social links, alternate names ("Young Innovations Club", "Inventions Club", …), parent School entity with geo | ✅ | `index.html`, `src/lib/structuredData.ts` |
| WebSite + SearchAction (`/blog?q=` works), FAQPage schema | ✅ | `index.html` |
| Sitemaps: static 13-route + dynamic blog sitemap, image sitemap entry for the banner, fresh `lastmod` | ✅ | `public/sitemap.xml`, Worker `/sitemap-blog.xml` |
| robots.txt: Googlebot/Bingbot/Yandex blocks, `/student/` + admin blocks, both sitemaps, IndexNow key pointer | ✅ | `public/robots.txt` |
| Bot user-agent coverage: all majors **+ AI search (GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot, Google-Extended)** + regional (SeznamBot, NaverBot/Yeti, YisouSpider, MojeekBot, BingPreview) | ✅ | `src/worker/prerender.ts` (`BOTS`) |
| Canonical host: `www.dvpyic.dpdns.org` → 301 → `dvpyic.dpdns.org`, HTTP→HTTPS | ✅ | `src/worker/index.ts` |
| llms.txt for AI crawlers | ✅ | `public/llms.txt` |

**Key architectural fact:** bots never execute the React app — the Worker
strips it and serves prerendered HTML. So *anything a crawler must see must
exist in `src/worker/prerender.ts` (fixed pages) or in the D1-backed blog
loader. Client-side react-helmet tags are only a user-experience fallback.*
When you add a new public page: add it to `PAGES`, `PAGE_META`, `CRUMB_NAMES`
and `public/sitemap.xml` together.

---

## 2. One-time webmaster setup (your tokens)

Generate the ownership token in each console, then set it as a Worker secret/var
and redeploy. The Worker injects the right meta tag into `/` automatically:

| Console | Token | Env var name | Meta tag injected |
|---|---|---|---|
| Google Search Console → URL prefix `https://dvpyic.dpdns.org/` | HTML tag content (the `google-site-verification=…` value) | `SEO_GOOGLE_VERIFICATION` | `<meta name="google-site-verification" …>` |
| Bing Webmaster Tools → Add site | HTML meta content | `SEO_BING_VERIFICATION` | `<meta name="msvalidate.01" …>` |
| Yandex Webmaster → Add site | HTML meta content | `SEO_YANDEX_VERIFICATION` | `<meta name="yandex-verification" …>` |

```bash
npx wrangler secret put SEO_GOOGLE_VERIFICATION
npx wrangler secret put SEO_BING_VERIFICATION
npx wrangler secret put SEO_YANDEX_VERIFICATION
npm run deploy
# verify: curl -s https://dvpyic.dpdns.org/ | grep -E "site-verification|msvalidate|yandex-verification"
```

(They are public-by-design; secrets keep them out of git, but `wrangler.json`
`vars` work too.)

### Console checklist after verification

**Google Search Console**
1. Submit both sitemaps: `https://dvpyic.dpdns.org/sitemap.xml` and `/sitemap-blog.xml`.
2. URL Inspection → `Request indexing` for `/`, `/about`, `/projects`, `/blog`, `/learning-hub`, `/contact`.
3. After 2–4 weeks: Performance → Queries tab. You should see `yicdvp` queries
   with growing impressions; brand-name rankings typically appear within days.

**Bing Webmaster Tools** (also powers Yahoo + most of DuckDuckGo)
1. Easiest import: "Import from Google Search Console" (same sitemaps come over).
2. Verify the site, then confirm `https://dvpyic.dpdns.org/indexnow-4b249edb452b1c6276c655cc97a3bf41.txt`
   opens and shows the key (it is a static file — it always will).
3. "URL Submission" is already automatic — every blog publish fires IndexNow.
   You can also push manually:
   ```bash
   # requires an admin CMS token (the /api/indexnow endpoint is permission 'blog')
   curl -X POST https://dvpyic.dpdns.org/api/indexnow \
     -H "Authorization: Bearer <cms-token>" -H "Content-Type: application/json" \
     -d '{"urls":["https://dvpyic.dpdns.org/","https://dvpyic.dpdns.org/blog"]}'
   ```
4. IndexNow dashboard in Bing will show submissions logs.

**Yandex Webmaster** — verify, submit `/sitemap.xml`, use "Re-index pages" for `/`.
Yandex also accepts IndexNow (`api.indexnow.org` is the common shared endpoint,
fan-out covers Yandex/Seznam/Naver/Yes).

**DuckDuckGo** — no console. It reads the Bing corpus + its own crawler
(DuckDuckBot). Keep Bing healthy and DDG follows.

**Apple / Safari** — Safari ranking comes from the same web signals; Siri and
Spotlight suggestions use `Applebot` (already prerendered for). No console
exists — nothing to register. Getting listed as a "notable" result relies on
the structured data (School/EducationalOrganization geo) and backlinks below.

---

## 3. The keyword playbook (why these will rank)

Target queries and the matching signal we've placed:

| Query | Signal |
|---|---|
| `yicdvp` | Homepage H1/link-nav `<strong>YICDVP</strong>`, manifest short_name, title suffix "\| YICDVP" everywhere, Organization `alternateName[0]`, OG banner badge |
| `dharmapala vidyalaya pannipitiya` | Homepage title contains it verbatim; Organization parentOrganization is a School entity with the full address + geo (6.8420, 79.9540); every page's footer address |
| `…young innovations club` | `alternateName` carries "Young Innovations Club", "Young Innovators' Club", "Inventions Club", "Innovation Club"; prerendered home copy includes an "Also known as" line — crawlers match phrase variants |
| `dharmapala vidyalaya pannipitiya clubs` | Home description + body both use the phrase "Dharmapala Vidyalaya clubs and societies", listing robotics/IoT/solar/3DP "club" activities |
| `school clubs pannipitiya` / `stem club sri lanka` | Descriptions + H1s across pages; Learning Hub content; breadcrumb entities |

Expected timeline (realistic): dormant-domain brand queries usually resolve in
**days–2 weeks on Google once submitted**, **1–3 weeks on Bing**, longer for
Yandex/Seznam. Non-brand local queries ("stem club sri lanka") need backlinks.

---

## 4. Backlinks & authority (the engine-side multiplier)

Structured on-page SEO alone cannot beat strong existing domains; links do the
rest. Highest-leverage, zero-budget links for a school STEM club:

1. **The school's own website** — ask Dharmapala Vidyalaya's site (and the
   old-boys' association site) to link to `https://dvpyic.dpdns.org/` with
   anchor "Young Innovators Club of Dharmapala Vidyalaya Pannipitiya".
2. **School Facebook page** — the club is already linked from
   `facebook.com/dharmapalaLKofficia` posts? Make one pinned post with the URL.
3. **Instagram/TikTok/YouTube** bios — set the website URL on
   `yicdvp_official` and YouTube channel profile (these are fast "known"
   profile links that create knowledge-panel signals).
4. **Competition organisers** — any hackathon/science-fair entry lists the
   club website; request it on every entry form.
5. **Local directories** — Google Business Profile (if the school has one, ask
   the school admin to list club website), Sri Lanka school-club directories,
   Wikipedia's "List of schools in Western Province" new sections politely —
   wikis generally need the school article first.
6. **Press/recaps** — write up every competition result as a blog post or /news
   item; partner schools often link to results coverage.

> Ask the school's webmaster/IT department to add the club link — this is
> typically the single most valuable referrer for "Dharmapala Vidyalaya"
> keyword clusters because the school domain is the authority anchor.

---

## 5. Operate: freshness cadence

- Publish ≥ 1 blog post or /news item per week → the dynamic blog sitemap +
  IndexNow auto-nudge + `lastmod` keep the site "recently changed" in engines.
- Competition results belong in **/news** first, then a longer **/blog** post.
- After any sitemap/fixed-page change: URL Inspection → Request indexing
  (Google) + bing "Submit URL" (optional; IndexNow generally suffices).
- Monthly: check GSC "Crawled – currently not indexed" list. If a page shows
  up there > 30 days, it lacks prerender (add it to `PAGES`) or thin content.
- Re-run `node scripts/build-og-banner.mjs` only if the logo changes.

## 6. Verification (repo-level)

```bash
npm run check                                      # types + build + dry-run
npm run test                                       # 96 tests incl. prerender suite
node scripts/ci/lint-ratchet.mjs                   # lint gate
curl -s https://dvpyic.dpdns.org/sitemap.xml | head # deployed sitemap
curl -s https://dvpyic.dpdns.org/ -A "Bingbot/2.0" | grep -ci dharmapala
curl -s https://dvpyic.dpdns.org/blog/<slug> -A "bingbot" | grep -i "og:title"  # per-post card
curl -s https://dvpyic.dpdns.org/indexnow-4b249edb452b1c6276c655cc97a3bf41.txt
```
