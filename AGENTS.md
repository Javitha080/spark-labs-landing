# AGENTS.md — Spark Labs Landing (YICDVP)

## Commands

```
npm run dev        # Vite dev server on :8080
npm run build      # tsc -b && vite build
npm run lint       # eslint . (flat config)
npm run preview    # build + vite preview
npm run check      # tsc && vite build && wrangler deploy --dry-run
npm run deploy     # wrangler deploy (Cloudflare Workers)
npm run deploy:pages  # wrangler pages deploy dist
npm run cf-typegen # wrangler types (regenerates worker-configuration.d.ts)
```

No test framework is configured.

## Critical Gotchas

- **`.env` contains live secrets** (Supabase keys, Cloudflare tokens). NEVER commit it. `.env`, `.env.*`, and `.dev.vars` are all gitignored.
- **`wrangler.json` `vars` section has the Supabase URL and Turnstile key baked in** — these are considered public/non-secret. Worker-side secrets (`SUPABASE_SERVICE_ROLE_KEY`) go in `.dev.vars` (local) or `wrangler secret` (deployed).
- **Cloudflare plugin only loads in production mode**: `cloudflare()` is added to Vite plugins only when `mode === "production"`. In dev, the `@cloudflare/vite-plugin` handles Worker integration automatically — no manual API proxy config needed.
- **`lovable-tagger` only loads in dev mode** — do not add it to production builds.
- **FormData in Worker must use `c.req.raw.formData()`** — Hono's `parseBody()` consumes the stream and returns a plain Record, NOT a FormData instance. Using it causes hangs → 504.
- **Never set `Cross-Origin-Embedder-Policy` header** in the Worker — it blocks cross-origin requests to Supabase storage, breaking file uploads.
- **Worker MUST use `SUPABASE_SERVICE_ROLE_KEY`** to bypass RLS for admin operations. Never fall back to the anon/publishable key.
- **`EnrollmentContext.tsx` is dead code** — all enrollment goes through `LearnerContext` (token-based, stored in localStorage + browser fingerprint).

## TypeScript & Lint Config

- `tsconfig.app.json`: `strict: false`, `noImplicitAny: false`, `strictNullChecks: false`, `noUnusedLocals: false`, `noUnusedParameters: false`
- ESLint: `@typescript-eslint/no-unused-vars` is turned `off`
- Three-project TS setup: `tsconfig.app.json` (src), `tsconfig.node.json` (vite config), `tsconfig.worker.json` (src/worker)

## Architecture

### Entry Points
- **Frontend**: `src/main.tsx` → `src/App.tsx` (all routes lazy-loaded)
- **Worker API**: `src/worker/index.ts` (Hono app, serves `/api/*` + SPA fallback via `ASSETS` binding)

### Provider Hierarchy (App.tsx, outer → inner)
`QueryClientProvider → HelmetProvider → ThemeProvider → ErrorBoundary → AppLoader → RoleProvider → LearnerProvider → GamificationProvider → TooltipProvider → BrowserRouter`

### Key Directory Boundaries
- `src/pages/` — Route-level pages (lazy-loaded in App.tsx)
- `src/pages/admin/` — Admin pages nested under `/admin` route with `AdminLayout`
- `src/components/ui/` — shadcn/ui primitives (auto-generated, do not edit)
- `src/context/` — `GamificationContext`, `LearnerContext`
- `src/contexts/` — `RoleContext` (RBAC, separate directory)
- `src/integrations/supabase/` — Auto-generated Supabase client (`client.ts`, `types.ts`)
- `src/worker/` — Cloudflare Worker (Hono API)
- `supabase/migrations/` — Database migrations
- `d1-migrations/` — D1 database migrations (separate from Supabase)

### Identity System
- **Students**: Token-based via `LearnerContext` — enroll via JoinUs form, token stored in localStorage + browser fingerprint. No Supabase auth.
- **Admins**: Supabase auth with role verification (`RoleContext`). Valid CMS roles: `admin`, `editor`, `content_creator`, `coordinator`.
- **Gamification** `getIdentifier()` tries learner token first, falls back to Supabase auth.

## Styling

- **Dark mode by default** (`ThemeProvider` with `defaultTheme="dark"`)
- Colors use CSS custom properties: `hsl(var(--primary))`, etc.
- Custom breakpoints: `xs` (480px), `tablet` (900px), `smartboard` (1280px), `wide` (1920px)
- Fonts: Space Grotesk (display), Inter (body), JetBrains Mono (code)
- `@/` path alias → `./src/`

## Animation Rules
- Never animate `filter: blur()` — use `opacity` + `transform` only (compositor-safe)
- `prefers-reduced-motion` kills all animations globally via CSS in `index.css`
- Hero particles: 8 max

### GSAP & Animation Guidelines
- **Use `@gsap/react`**: Always prefer the `useGSAP()` hook over `useEffect()` or `useLayoutEffect()` for creating GSAP animations in React.
- **Scoping**: Always pass a `scope` (typically a container `useRef`) in the configuration object to scope selectors (e.g. `useGSAP(() => {}, { scope: containerRef })`). Never target generic global selector strings without scoping.
- **Plugin Registration**: Register plugins once at the module-level (outside of React lifecycle) using `gsap.registerPlugin(useGSAP, ScrollTrigger)`.
- **Manual Cleanup fallback**: If `useGSAP` is not used, wrap GSAP code inside a `gsap.context(ctx => {}, scopeRef)` and return `() => ctx.revert()` in the effect cleanup to prevent memory leaks.
- **ScrollTrigger Standards**:
  - Never combine `scrub` and `toggleActions` on the same trigger.
  - For horizontal container scrolling, use `ease: "none"` on the scrolling tween to keep scroll and horizontal positions properly aligned.
  - Set `refreshPriority` if creating triggers out of chronological page order (top-to-bottom).
- **Performance**: Animate compositor-safe properties only (`opacity` and `transform` elements like `x`, `y`, `scale`, `rotation`). Do not animate expensive layout properties (`top`, `left`, `width`, `height`, `margin`, `padding`).

## Build Optimizations
- Manual chunk splitting in `vite.config.ts` (vendor-react, vendor-radix, vendor-motion, vendor-query, vendor-date, vendor-forms, vendor-editor, vendor-icons, vendor-supabase, vendor-security, etc.)
- `@tiptap/react` must NOT be in `vendor-editor` chunk — it imports React and creates circular dep with `vendor-react`
- esbuild minification (not Terser) — avoids cross-chunk export issues
- `console`/`debugger` dropped in production via esbuild
- Source maps disabled in production

## Deployment
- Domain: `dvpyic.dpdns.org` (custom domain in wrangler.json)
- Worker serves both API (`/api/*`) and SPA (static assets with SPA fallback via `ASSETS` binding)
- Bindings: `RATE_LIMIT_KV`, `CACHE_DB` (D1), `EMAIL_QUEUE`, `ANALYTICS`
- `npm run check` = full pre-deploy verification (types + build + dry-run)

## Skill & Research Guidelines

- **Always Use Skills**: Always prioritize loading and utilizing relevant skills before performing tasks.
- **Skill Search Paths**: If a needed skill is not active, search the following local directories for skill instructions:
  - `c:\Users\Xe0n0\Desktop\spark-labs-landing\.agents\skills`
  - `c:\Users\Xe0n0\Desktop\spark-labs-landing\.claude\skills`
  - `c:\Users\Xe0n0\Desktop\spark-labs-landing\.agent\skills`
- **Fallback to Internet**: If the required skill or information is not found in the directories listed above, search the web/internet to gather the necessary details.

