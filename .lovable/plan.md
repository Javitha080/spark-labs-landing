## Goal
Add **anime.js v4** alongside the existing Framer Motion stack to upgrade key animations, and systematically improve error handling across pages, hooks, and edge-function calls.

---

## Part 1 — anime.js Integration & Animation Upgrades

### 1.1 Install & set up
- Add `animejs@^4` and `@types/animejs` to dependencies.
- Create `src/lib/anime.ts` — a thin wrapper exporting `anime`, `stagger`, `createTimeline`, plus a `useAnime(ref, options, deps)` hook that:
  - Respects `prefers-reduced-motion` (skips animation, applies final state).
  - Cleans up timelines on unmount to prevent leaks.
  - Auto-pauses when element scrolls out of view.

### 1.2 New reusable animation primitives
Create `src/components/animation/AnimeReveal.tsx` with:
- `<AnimeText>` — character/word splitter with stagger reveal (replaces heavy per-char Framer text).
- `<AnimeCounter>` — smooth number tweens for `StatsSection` (currently uses RAF manually).
- `<AnimeMagnetic>` — pointer-tracking magnetic hover for primary CTAs.
- `<AnimePath>` — SVG path drawing for dividers/icons.

### 1.3 Targeted upgrades (high-impact, low-risk)
- `src/components/home/Hero.tsx` — replace headline reveal with `AnimeText` (better perf than current word-split).
- `src/components/home/StatsSection.tsx` — swap manual RAF counter for `AnimeCounter`.
- `src/components/animation/ScrollAnimations.tsx` — keep API, but route `TextRevealOnScroll` through anime.js internally.
- `src/components/loading/CinematicLoader.tsx` — anime.js timeline for the boot sequence (smoother than CSS keyframes).
- `src/components/Header.tsx` — magnetic effect on the primary CTA only.

### 1.4 Performance guardrails (keep existing rules)
- Compositor-only props (`opacity`, `transform`).
- No `filter: blur()` animations.
- Global `prefers-reduced-motion` short-circuit in `useAnime`.

---

## Part 2 — Error Handling Upgrades

### 2.1 Centralized utilities (`src/lib/errors.ts` — new)
- `getSafeErrorMessage(err)` — strips stack traces / internal paths, maps Supabase `PostgrestError` codes (`PGRST116`, `23505`, `42501`, etc.) to user-friendly text.
- `logError(err, context)` — dev-only `console.error`, prod-safe (no PII).
- `toastError(err, fallback)` — wraps `useToast` + `getSafeErrorMessage`.
- `withRetry(fn, { retries, backoff })` — for transient network failures.

### 2.2 Route-level error boundary
- Add `src/components/ui/RouteErrorBoundary.tsx` — lighter boundary used **per-route** in `App.tsx` so a crash in `/admin/blog` doesn't blank the whole app (current single top-level boundary does).
- Wrap each lazy `<Suspense>` route with it.

### 2.3 Async/Supabase call hardening
Audit and fix the 35 files that call `supabase.*`. Standard pattern enforced:
```ts
const { data, error } = await supabase.from(...)...;
if (error) { toastError(error, "Couldn't load X"); logError(error, "X.fetch"); return; }
```
Priority files (currently have weak/missing handling — confirmed via grep):
- `src/pages/admin/GalleryManager.tsx`, `EventsManager.tsx`, `ProjectsManager.tsx`, `TeachersManager.tsx`, `TeamManager.tsx`, `BlogManager.tsx`, `BlogEditor.tsx`, `EnrollmentManager.tsx`, `LearningHubManager.tsx`, `LandingPageManager.tsx`, `NotificationsManager.tsx`, `RolesManager.tsx`, `UsersManager.tsx`, `ScheduleManager.tsx`, `ActivityLog.tsx`, `Analytics.tsx`, `ProfileSettings.tsx`.
- Public pages: `GalleryPage.tsx`, `Blog.tsx`, `BlogPost.tsx`, `EventsPage.tsx`, `ProjectsPage.tsx`, `TeamPage.tsx`, `LearningHub.tsx`, `MyLearning.tsx`, `CourseDetail.tsx`, `WorkshopDetail.tsx`, `Classroom.tsx`, `ProjectDetail.tsx`.
- Components: `Contact.tsx`, `JoinUs.tsx`, `InnovationChatbot.tsx`, `learning/FileUpload.tsx`, `auth/LoginForm.tsx`.

### 2.4 Hook hardening
- `useRealtimeSync`, `useRealtimeAnalytics`, `useSessionTracking`, `useAutosave`, `useLearningRecommendations` — wrap channel/setup in try/catch, expose `error` state, retry on disconnect.

### 2.5 Edge function call wrapper
Add `src/lib/invokeFunction.ts`: typed wrapper around `supabase.functions.invoke` that:
- Times out after 30s (`AbortController`).
- Maps non-2xx + network failures to friendly messages.
- Used by `upload-media`, `admin-create-user`, `innovation-chat`, `discord-webhook`, `send-contact-message`, `send-enrollment-notification`, `blog-ai-assistant`.

### 2.6 Form validation safety nets
- Audit all forms (`LoginForm`, `Contact`, `JoinUs`, `BlogEditor`, admin managers) — ensure Zod schemas exist and submit handlers wrap in try/catch with `toastError`.

### 2.7 Global window error capture
- In `src/main.tsx`, add `window.addEventListener('error', …)` and `'unhandledrejection'` → `logError` to surface silent failures (dev) without breaking prod UX.

---

## Out of scope (intentionally)
- No removal of Framer Motion (still used heavily; coexists with anime.js).
- No changes to existing migrations / RLS / edge function security (already audited last turn).
- No test framework setup (project has none configured).

## Risk / mitigation
- Bundle size: anime.js v4 is ~15KB gzipped; offset by trimming some Framer usage in Part 1.3.
- Behavior parity: keep existing component APIs (`FadeInOnScroll`, etc.) unchanged so no caller breaks.
- Per-route boundary swap is additive; top-level boundary remains as safety net.
