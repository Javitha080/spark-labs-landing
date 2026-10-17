# AGENTS.md — Spark Labs Landing (YICDVP)

## Commands

```bash
npm run dev        # Vite dev server on :8080
npm run build      # tsc -b && vite build
npm run lint       # eslint . (flat config)
npm run test       # vitest run (smoke tests in src/**/*.test.{ts,tsx})
npm run test:watch # vitest watch mode
npm run preview    # build + vite preview
npm run check      # tsc && vite build && wrangler deploy --dry-run
npm run deploy     # wrangler deploy (Cloudflare Workers)
npm run deploy:pages  # wrangler pages deploy dist
npm run cf-typegen # wrangler types (regenerates worker-configuration.d.ts)
npm run doctor     # react-doctor triage
```

Test framework: **Vitest 5** (jsdom + @testing-library/react). Unit tests live next to their subject (`src/lib/cspPolicy.test.ts`, `src/lib/utils.test.ts`, `src/schemas/blog.test.ts`) or under `src/components/` for RTL smoke tests; a shared setup (`jest-dom` matchers) is in `src/test/setup.ts`. Note: `npm run lint` / CI ratchet can take 2–3 min on Windows (Defender + huge node_modules) — the ratchet spawns the local eslint bin directly (`scripts/ci/lint-ratchet.mjs`), avoid `npx eslint`.

## Critical Gotchas

- **`.env` contains live secrets** (Supabase keys, Cloudflare tokens). NEVER commit it. `.env`, `.env.*`, and `.dev.vars` are all gitignored.
- **`wrangler.json` `vars` section holds only public/non-secret values** — `NODE_ENV`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Worker-side secrets (`SUPABASE_SERVICE_ROLE_KEY`, `LETTERMINT_API_KEY`, `TURNSTILE_SECRET_KEY`) go in `.dev.vars` (local) or `wrangler secret` (deployed).
- **`wrangler.json` must stay strict JSON** (no comments/trailing commas) — `scripts/ci/export-build-env.mjs` and `scripts/ci/verify-bundle.mjs` parse it with `JSON.parse`.
- **CSP single source of truth**: `src/lib/cspPolicy.ts`. The Worker (`src/worker/index.ts`), `src/lib/security.ts` (`getCSPPolicy`), and the Vite dev-server headers all consume it — edit that file only. No `unsafe-eval` (no runtime dep evaluates dynamic JS); dev mode adds localhost HMR allowances via `buildCSPPolicy({ dev: true })`.
- **`BUILD_VERSION` comes from `package.json` (`version`)** — bump the package version when cutting a release so `/api/build-version` reflects it.
- **Cloudflare plugin only loads in production mode**: `cloudflare()` added to Vite plugins only when `mode === "production"`. In dev, `@cloudflare/vite-plugin` handles Worker integration automatically — no manual API proxy config needed.
- **`lovable-tagger` only loads in dev mode** — do not add to production builds.
- **FormData in Worker must use `c.req.raw.formData()`** — Hono's `parseBody()` consumes the stream and returns a plain Record, NOT a FormData instance. Using it causes hangs → 504.
- **Never set `Cross-Origin-Embedder-Policy` header** in the Worker — it blocks cross-origin requests to Supabase storage, breaking file uploads.
- **Worker MUST use `SUPABASE_SERVICE_ROLE_KEY`** to bypass RLS for admin operations. Never fall back to the anon/publishable key.
- **No `EnrollmentContext` / `LearnerContext`** — both are gone. All student state goes through `StudentAuthContext` (Supabase Auth + `student_accounts`) composed with `GamificationContext`.
- **`src/components/ui/`** — shadcn/ui primitives (auto-generated, do not edit).

## TypeScript & Lint Config

- `tsconfig.app.json`: `strict: false`, `noImplicitAny: false`, `strictNullChecks: false`, `noUnusedLocals: false`, `noUnusedParameters: false`; **excludes `src/worker`** (checked by the worker project only, otherwise `HTMLRewriter` etc. don't resolve)
- `tsconfig.worker.json`: extends node config, `@cloudflare/workers-types` (v5) + `worker-configuration.d.ts` via `types`, `resolveJsonModule: true` (for the BUILD_VERSION package.json import)
- ESLint: `@typescript-eslint/no-unused-vars` is turned `off`
- **Lint is clean (0 errors / 0 warnings repo-wide)** and the CI ratchet (`.github/lint-baseline.json`) is a hard gate — never raise the baseline except via `node scripts/ci/lint-ratchet.mjs --update`
- `eslint.config.js` ignores: dist, `.agent`, `.lovable`, `.wrangler`, `.react-doctor`, `.bun-cache`, `worker-configuration.d.ts`, `src/components/ui/**`
- Three-project TS setup: `tsconfig.app.json` (src minus worker), `tsconfig.node.json` (vite config), `tsconfig.worker.json` (src/worker)

## Architecture

### Entry Points
- **Frontend**: `src/main.tsx` → `src/App.tsx` (all routes lazy-loaded)
- **Worker API**: `src/worker/index.ts` (Hono app, serves `/api/*` + SPA fallback via `ASSETS` binding)

### Provider Hierarchy (src/App.tsx:116-132, outer → inner)
`QueryClientProvider → HelmetProvider → ThemeProvider → RoleProvider → StudentAuthProvider → GamificationProvider → TooltipProvider`, with `ErrorBoundary` + `BrowserRouter` (plus `LazyMotion`, `SmoothScroll`) composed inside as children.

### Key Directory Boundaries
- `src/pages/` — Route-level pages (lazy-loaded in App.tsx)
- `src/pages/admin/` — Admin pages nested under `/admin` route with `AdminLayout`
- `src/context/` — `StudentAuthContext`, `GamificationContext`
- `src/contexts/` — `RoleContext` (RBAC, separate directory)
- `src/integrations/supabase/` — Auto-generated Supabase client (`client.ts`, `types.ts`)
- `src/worker/` — Cloudflare Worker (Hono API)
- `supabase/migrations/` — Database migrations
- `d1-migrations/` — D1 database migrations (separate from Supabase)

### Identity System
- **Students**: Supabase Auth via `StudentAuthContext` — profile in `student_accounts`, enrollments in `learning_enrollments`, progress in `learning_progress`. No token/localStorage identity.
- **Admins**: Supabase auth with role verification (`RoleContext`). Valid CMS roles: `admin`, `editor`, `content_creator`, `coordinator`.
- **Gamification** `getIdentifier()` tries the `StudentAuth` student (`user_id` = `student.authUserId`) first, falls back to Supabase auth session.

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

- Domain: `dvpyic.dpdns.org` (custom domain in wrangler.json); `workers_dev` is **disabled** — the `*.workers.dev` URL is not served
- Worker serves both API (`/api/*`) and SPA (static assets with SPA fallback via `ASSETS` binding)
- Bindings: `RATE_LIMIT_KV`, `CACHE_DB` (D1 `edge-cache`), `EMAIL_QUEUE` (Lettermint consumer), `ANALYTICS`
- `npm run check` = full pre-deploy verification (types + build + dry-run)
- CI/CD: pushes to `main` deploy automatically after the CI gates pass (see `.github/CI-CD.md`); manual rollback via `.github/workflows/rollback.yml`
- Ops guide: **`docs/DEPLOYMENT.md`** (secrets, D1 migrations, email, admin CMS setup)

## Skill & Research Guidelines

- **Always Use Skills**: Always prioritize loading and utilizing relevant skills before performing tasks.
- **Skill Search Paths**: If a needed skill is not active, search the local skill catalog:
  - `skills/react-doctor/SKILL.md` (React triage: lint, a11y, bundle, architecture)
- **Fallback to Internet**: If the required skill or information is not found in the directories listed above, search the web/internet to gather the necessary details.