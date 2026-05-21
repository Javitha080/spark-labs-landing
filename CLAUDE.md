# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Web application for the Young Innovators Club (Dharmapala Vidyalaya) — a React SPA deployed on Cloudflare Workers/Pages. Features a public-facing site (landing, blog, learning hub, events, projects, gallery) and a full admin panel at `/admin`. Domain: `dvpyic.dpdns.org`.

## Commands

- **Dev server:** `npm run dev` (Vite on port 8080)
- **Build:** `npm run build` (runs `tsc -b && vite build`)
- **Lint:** `npm run lint` (ESLint flat config)
- **Type check + build + dry-run deploy:** `npm run check`
- **Preview production build:** `npm run preview`
- **Deploy to Cloudflare Workers:** `npm run deploy`
- **Deploy to Cloudflare Pages:** `npm run deploy:pages`
- **Generate Cloudflare types:** `npm run cf-typegen`

No test framework is configured.

## Architecture

### Tech Stack
- React 19 + TypeScript + Vite 7 (SWC plugin)
- Tailwind CSS 3 with shadcn/ui (Radix primitives)
- Supabase for backend (auth, database, storage)
- Cloudflare Workers (Hono) for server-side API
- TanStack React Query for data fetching
- Framer Motion for animations
- react-router-dom v6 with lazy-loaded routes

### Path Alias
`@/` maps to `./src/` (configured in tsconfig and vite).

### Key Directories

- `src/pages/` — Route-level page components (all lazy-loaded in `App.tsx`)
- `src/pages/admin/` — Admin panel pages (nested under `/admin` route with `AdminLayout`)
- `src/components/` — Shared and feature-specific components
- `src/components/ui/` — shadcn/ui primitives (do not manually edit these)
- `src/components/admin/` — Admin-specific components (including `learning/` sub-module)
- `src/components/blog/` — Blog feature components (rich text editor uses TipTap)
- `src/components/home/` — Landing page section components
- `src/components/SEOHead.tsx` — Reusable SEO component (title, description, canonical, OG, Twitter)
- `src/context/` — React contexts: `GamificationContext`, `LearnerContext` (EnrollmentContext is dead code)
- `src/contexts/` — `RoleContext` (separate directory, handles admin role-based access)
- `src/hooks/` — Custom hooks (autosave, analytics, scroll animation, recommendations)
- `src/integrations/supabase/` — Auto-generated Supabase client and types (`client.ts`, `types.ts`)
- `src/lib/` — Utilities: `seo.ts` (SEO constants), `gamification.ts`, security modules
- `src/worker/index.ts` — Cloudflare Worker entry point (Hono API with `/api/*` routes)
- `src/types/` — Shared TypeScript type definitions
- `supabase/migrations/` — Database migration SQL files

### Provider Hierarchy (App.tsx)
QueryClientProvider → HelmetProvider → ThemeProvider → ErrorBoundary → AppLoader → RoleProvider → StudentAuthProvider → GamificationProvider → TooltipProvider → BrowserRouter

### Learning Hub Identity System
- **Supabase Auth-based** via `StudentAuthContext` — students enroll via JoinUs form, account created by Worker API with auto-generated password, stored in `student_accounts` table. Token stored in Supabase session.
- `GamificationContext` uses `student.authUserId` (Supabase auth user ID) as `user_id` column.
- `useLearningRecommendations` accepts optional `user_id` for authenticated students.
- `EnrollmentContext.tsx` and `LearnerContext.tsx` have been **removed**. The old token-based system (`learner_token_id`) still exists in the DB schema for backward compatibility but is no longer used by the frontend.
- Q&A discussions still require Supabase auth (admin/editor only).
- Dynamic column queries use `as any` casts to bypass auto-generated Supabase types that don't yet know about `user_id` columns.

### SEO
- `src/lib/seo.ts` — Centralized constants: `SITE_URL`, `SITE_NAME`, `DEFAULT_OG_IMAGE`
- `src/components/SEOHead.tsx` — Reusable Helmet wrapper (title, description, canonical, OG, Twitter, article tags, noindex)
- All pages use `SEOHead` except `BlogPost.tsx` and `CourseDetail.tsx` (which use raw Helmet for dynamic JSON-LD schema)
- `public/sitemap.xml` — Static sitemap for all public routes
- `public/robots.txt` — Blocks `/admin/`, references sitemap
- `index.html` — WebSite + EducationalOrganization JSON-LD schemas

### Deployment
- Cloudflare Workers with Hono (`wrangler.json`, worker entry at `src/worker/index.ts`)
- Worker serves both the API (`/api/*`) and the SPA (static assets with SPA fallback)
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (client-side); `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (worker-side)

### Styling Conventions
- Dark mode by default (`ThemeProvider` with `defaultTheme="dark"`)
- Colors use CSS custom properties via HSL (`hsl(var(--primary))`, etc.)
- Custom breakpoints: `xs` (480px), `tablet` (900px), `smartboard` (1280px), `wide` (1920px)
- Fonts: Space Grotesk (display/headings), Inter (body), JetBrains Mono (code)
- Custom animations defined in `tailwind.config.ts`: `fade-in`, `fade-up`, `scale-in`, `float`, `glow-pulse`, `blob`, etc.

### Animation Performance Rules
- Never animate `filter: blur()` — forces full-layer repaint. Use `opacity` + `transform` only (compositor-safe).
- Use `will-change-transform` class for GPU-promoted elements.
- Prefer `requestAnimationFrame` over `setInterval` for counters/progress.
- Reduce particle counts on landing page (8 max in Hero).
- `prefers-reduced-motion` kills all animations globally via CSS media query in `index.css`.
- Header scroll listener is throttled to only re-render on threshold crossing (50px).

### Build Optimizations
- Manual chunk splitting for vendor libraries (React, Radix, Framer Motion, React Query, date-fns, forms)
- Console/debugger statements dropped in production via esbuild
- Source maps disabled in production
- Uses esbuild minification (not Terser) due to cross-chunk export issues
