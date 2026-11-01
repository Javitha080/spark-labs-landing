# System Audit — Spark Labs / YICDVP (Udemy-rebuild platform)

**Date:** 2026-10-30 · **Scope:** full stack (frontend, Cloudflare Worker backend, Supabase schema, admin CMS wiring, student learning flow)

The system was examined end-to-end to separate **real** from **half-built / fake / dead** code, and the highest-value gaps were fixed in this pass. This document is archived as the baseline for future upgrades: each finding below is marked ✅ fixed / ⚠️ improvement left open / ℹ️ working as designed.

---

## 1. Architecture map (what exists)

| Layer | Where | State |
|---|---|---|
| Landing site + CMS | `src/pages/*`, `src/components/*` — pages feed from `cms_*` / `*_items` Supabase tables | Real |
| Student auth | Supabase Auth; profile in `profiles` + `student_accounts`; `StudentRoute` guard | Real |
| Cloudflare Worker API | `src/worker/index.ts` (Hono): `/api/*` + SPA fallback, D1 edge-cache, KV rate limits, Analytics Engine, Email queue | Real |
| Admin CMS | `/admin/*` (≈20 managers) — every write goes to a real table (no dummy data, no dead buttons) | Real |
| Learning system | `learning_courses/sections/modules/module_content_blocks`, enrollments, progress, reviews, Q&A, workshops, resources | Real (Udemy-style) |
| Gamification | `learning_user_stats` (XP/streaks), `learning_achievements` | Was broken — fixed |
| Certificates | — | Was pure copy — now real |

## 2. Critical bugs found & fixed in this pass ✅

### 2.1 Gamification was silently dead for students
- Migration `20260503081734` replaced "Users can insert own achievements" with an **admin-only** INSERT policy on `learning_achievements`.
- `awardAchievement()` swallowed the resulting 403 (`catch → return false`), so **no student ever earned a badge**; `addXp` is only reachable through it → the whole XP economy collapsed to +5/activity.
- Worse: `customFetch` in `src/integrations/supabase/client.ts` **cleared the Supabase session on any non-auth 401/403** → the RLS 403 *logged students out* mid-interaction.
- **Fixes:** new migration `20261030000000` restores user-self-insert; `client.ts` only clears on 401; `awardAchievement` logs instead of swallowing; streak badges (7/30 days) now actually award via `recordActivity`.

### 2.2 Personalized recommendations were mis-wired
`LearningHub.tsx` passed `student.authUserId` as the hook's `learnerTokenId` param → queries hit `learner_token_id` (never populated for auth'ed users) → every student fell back to the generic popular list. Interactions were being recorded correctly but never read. **Fixed** (hook resolves the session user itself).

### 2.3 Classroom holes
- **No enrollment check:** any signed-in user could open `/learning-hub/classroom/:id` for a course they're not enrolled in and record progress. Now gated server-side (bounces to the course page).
- **Draft modules leaked:** module fetch had no `is_published` filter (CourseDetail filters). Fixed to published-only.
- **Celebration/completion raced on stale state:** now reads the freshly-triggered enrollment progress from the server; awards `completed_course` badge.

### 2.4 Admin RBAC gaps
- `/admin/leadership` had **no entry in `PAGE_PERMISSION_MAP`** → every non-admin got Access Denied despite the sidebar offering it. Now `team` permission.
- Profile Settings link was unconditional, but `/admin/profile` mapped to `home` (denied for `content_creator`/`coordinator`). New dedicated `profile` permission granted to all CMS roles.
- Login redirected **everyone** to `/admin/events`; roles without `events` permission bounced in a deny-loop. New `getCMSLandingPath(role)` in `src/lib/rbac.ts` lands each role on its first permitted page.

### 2.5 Certificates were marketing copy
`"Certificate of completion"` was hardcoded text; MyLearning teased a certificate that links to nothing. **Built:**
- `learning_certificates` table + RLS (issue only when the enrollment is ≥100%; verifiable `certificate_code` like `YIC-XXXXXXXXXXXX-1026`) + public verification view.
- `update_enrollment_progress` trigger now **stamps `completed_at` at 100%** (and clears it on regress) + backfills existing rows.
- New page `/learning-hub/certificate/:courseId` (`StudentRoute`) — print/PDF-ready sheet, print isolation CSS, printable from Classroom celebration, CourseDetail sidebar (turns into a link at 100%), and MyLearning completed tab.
- Honors `course.certificate_enabled` (now a real DB column, default on).

### 2.6 Video resume was localStorage-only
`last_position` exists on `learning_progress` but was never written; the code's own comment admitted "learning_enrollments has no such columns" (and read fake columns). **Fixes:** timestamp writes go to `learning_progress.last_position` (plain UPDATE, no upsert-wipe of completion state); localStorage kept as the instant cache; `getLastModule` now falls back to real server data instead of nonexistent enrollment columns.

### 2.7 Admin tripwire — Team vs Leadership
`TeamManager` listed **all** `team_members`, so leaders appeared (and could be deleted) from both managers, while the Team modal silently couldn't edit the leadership-specific fields. Team is now scoped to `is_leadership = false`; LeadershipManager owns leaders.

### 2.8 Fabricated numbers in the Learning dashboard
`DashboardTab` shipped `learnerEnrollments: 0` (prop the stat card doesn't even accept) and a fabricated `grade: "Student"`. Both removed.

## 3. Backend (Worker) — dead weight removed ✅

- Deleted `hasCmsAccess()` (duplicate of `authMiddleware` role resolution, zero callers).
- Deleted the placeholder `getAnalyticsSummary()` returning all-zeros (GraphQL integration was never built; nothing imported it).
- Removed dead `TURNSTILE_SITE_KEY` env declaration and the `/api/admin` rate-limit branch (no such routes exist).
- **Newsletter hole completed:** `Footer.tsx` now renders the Turnstile widget and sends `X-Turnstile-Token`; the worker enforces it whenever `TURNSTILE_SECRET_KEY` is configured. This closes the explicit TODO at the old route.

## 4. Hardened patterns that are NOT bugs (ℹ️ by design)

- Stale `worker-configuration.d.ts` — regenerated types may be needed (`npm run cf-typegen`); the worker uses its own `Env` so it compiles regardless. Check that `SUPABASE_SERVICE_ROLE_KEY` / `TURNSTILE_SECRET_KEY` appear after regeneration; an old `SUPABASE_FALLBACK_KEY` secret in any environment would 503 every admin route.
- Dead-but-real worker routes `/api/verify-turnstile`, `/api/upload-media`, `/api/send-enrollment-notification`: functional, currently without frontend callers. `upload-media` is stricter (no SVG, 95 MB videos) than the direct-to-Supabase `FileUpload.tsx` which admin CMS actually uses — acceptable; unify limits if you ever front the direct path with the worker.
- `fetchWithFallback()` in `src/lib/edgeApi.ts` is complete but unwired — pages hand-roll the same edge→Supabase fallback. Safe to adopt gradually, not a defect.
- Uploads for the CMS go **directly to Supabase Storage** (`course-content` bucket, admin-only inserts post-lockdown) — by design.
- Bot prerender content is deliberately hardcoded (SEO copy) and visibly drifting from CMS rows — revisit if SEO pages diverge badly.
- `analytics.ts` realtime events and session tracking are admin-mounted only; student sessions aren't tracked to `user_sessions` yet (⚠️ open item).

## 5. Remaining open work (⚠️ suggestions, ordered)

1. **Achievements that still can't fire:** `speed_learner`, `comeback_kid` have no award logic anywhere; `first_review_5_star`/`qa_contributor` fire but only on the exact conditions in CourseDetail. Decide the semantics, then wire them like `streak_7_days`.
2. **Notes & last-module across devices:** notes are still localStorage-only (`classroom-note-*`). If cross-device notes matter, add a `learning_notes` table + editor sync.
3. **Achievements UI:** `learning_achievements` loads in GamificationContext and MyLearning badge chips render, but there's no dedicated achievements page/locker; levels tiers are only XP-based.
4. **Duplicated admin managers** (intentional, but debt): two content-block managers (Landing/ContentTab), CourseBuilder reachable from two tabs, ClassroomTab vs EnrollmentsTab both add/remove enrollments. Consolidate or split permissions.
5. **FileUpload vs worker limits** — resolved: `FileUpload` already mirrors the Worker tiers (image 25 MB, audio/PDF 50 MB, video 95 MB) and rejects SVG. The three direct-to-storage image pickers (`ProfileSettings`, `LeadershipFormModal`, `UserEditModal`) still used a bare `image/*` check, which admitted SVG into the public `avatars`/`leadership` buckets, and kept the client-supplied extension. They now share `src/lib/uploadValidation.ts`, which rejects SVG/XML, resolves the MIME from the extension when the browser reports none, and stores the canonical extension derived from the validated MIME.
6. **Verify signup** — checked, not a problem: `admin-create-user` creates the auth user with the service-role key (`auth.admin.createUser`), and the `on_auth_user_created_student` trigger (`handle_new_auth_user`, `SECURITY DEFINER`, `ON CONFLICT (auth_user_id) DO NOTHING`) writes the `student_accounts` row. Nothing inserts from the browser, so `students_insert_own` is not on that path.
7. **Newsletter template** emails the admin inbox per subscriber — fine for club volume; a real list service can take over later.
8. Dead `VideoPlayer.tsx` (`components/learning`) — a good component nobody uses; either replace Classroom's raw `<video>` with it (gains confetti/progress events) or delete it.

## 6. Migration & rollback notes

- Five forward migrations, applied in filename order:
  1. `20261030000000_achievements_certificates_resume.sql` — achievements policy restore, `completed_at` trigger + backfill, `learning_certificates` + RLS + public view, `certificate_enabled` column.
  2. `20261030120000_get_cms_role_resolver.sql` — `get_cms_role()`, the single role resolver used by the Worker, `RoleContext`, and the three admin edge functions. **Must be applied before the new Worker or edge functions deploy**, or admin auth fails closed.
  3. `20261030150000_learning_progress_updated_at.sql` — `updated_at` + trigger on `learning_progress`, so "resume last module" can order by recency instead of video seconds.
  4. `20261031000000_drop_permission_tables.sql` — drops the unenforced `permissions` / `role_permissions` / `has_permission()`. It was parked in `supabase/pending/` until the `0.4.0` frontend (whose `RolesManager` no longer queries those tables) was live, applied by hand on 2026-11-01, then moved into the migration set so a fresh environment reproduces the same schema.
  5. `20261031120000_harden_public_views_and_role_rpcs.sql` — replaces the anon-listable certificate view with `verify_certificate(text)`, guards `get_cms_role(uuid)`, and closes the anon reads on the `team_members` / `teachers` base tables.
- Post-apply state verified from the REST API on 2026-11-01: `permissions`, `role_permissions` and `has_permission()` return `404`; `roles`, `get_cms_role` (401 for anon), `verify_certificate` (`200 []`), `team_members_public` and `learning_certificates` still answer.
- All five migrations are re-runnable (`IF NOT EXISTS` / `DROP ... IF EXISTS` / `CREATE OR REPLACE`), so an out-of-band SQL application followed by `supabase db push` does not abort mid-file.
- All new RLS policies preserve the existing security model: users only touch their own rows, public can only read `team_members_public` / `leadership_members_public` / `teachers_public` (owner-rights, `email` masked by `show_email`) and look up a single certificate by code through `verify_certificate(text)`.
- No D1 changes; no worker binding changes.

---

## 7. Validation & post-audit fixes caught during verification (same-day addendum)

- **`npm run build` was failing outright** — an uncommitted `cloudflare({ copyDevVarsToDist: false })` experiment in `vite.config.ts` produced `TS2353` at the `tsc -b` (tsconfig.node) stage, breaking every build (`BUILD_EXIT_2` in the gates log). The installed `@cloudflare/vite-plugin@1.64.0` has no such option. It **does** copy `.dev.vars` into the Worker output directory (`dist/spark_labs_landing/.dev.vars`, Vite prints "Using secrets defined in .dev.vars"), which is local-only: the deployed asset directory is `dist/client`, where the file never appears, and wrangler uploads secrets only via `wrangler secret put`. Verified with a dry-run deploy: the upload lists the Worker module plus `dist/client` assets only.
- **Public verify view was self-defeating** — `learning_certificates_public` was created `WITH (security_invoker = true)`, under which anon queries hit `learning_certificates` RLS (`auth.uid() = user_id`) and every public lookup would return zero rows. Changed to a default (owner-rights) view exposing only certificate code, student name and course metadata; rationale is in the migration comments. **Follow-up (2026-10-31):** an owner-rights view granted to `anon` is a list endpoint — anyone with the publishable key could enumerate every certificate, student name and course. `20261031120000_harden_public_views_and_role_rpcs.sql` drops the view and replaces it with `verify_certificate(text)`, a single-code lookup.
- **Owner-rights certificate view was also listable (2026-10-31 follow-up)** — the anon-granted view from the bullet above returned *every* student name, course and certificate code to one anonymous request. `supabase/migrations/20261031120000_harden_public_views_and_role_rpcs.sql` drops it and exposes `verify_certificate(text)` (single lookup by code) instead. The same migration adds the caller guard to `get_cms_role(uuid)` and re-closes the anon reads that `20260504140000` opened on the `team_members` / `teachers` base tables.
- **Local `.dev.vars` env gap documented** — it holds `SUPABASE_FALLBACK_KEY` (imported by nothing in `src/` → dead config) and lacks `SUPABASE_SERVICE_ROLE_KEY` / `TURNSTILE_SECRET_KEY`, so local dev intentionally runs the Worker in the publishable-key fallback mode with admin ops unavailable; deployed env unaffected. `worker-configuration.d.ts` regenerated via `wrangler types` to match reality.
- **Own regressions caught by the ratchet and fixed:** render-time `awardRef.current` write in `GamificationContext.tsx` (now inside an effect), an `eslint-disable` spaced one method away from its `any` cast in `Certificate.tsx`, and a stale disable directive in `Classroom.tsx`.
- **Gates so far:** `tsc` per-project app / node / worker all exit 0 (worker checked against the freshly regenerated runtime types); `vitest run` 7 files / 35 tests passed (~29 s; a previous runner's `--reporter=basic` flag fails on Vitest 5 — treat any such crash as a runner bug, not a test failure). Final repo-wide ratchet re-run to be appended when it completes.
- **Final ratchet: 0 errors / 0 warnings repo-wide** (baseline gate passes: 0 ≤ 0).
- **Worker logs were being compiled out (2026-10-31 follow-up)** — the global `esbuild.drop: ['console', 'debugger']` applied to every Vite environment, including the Worker. The production Worker bundle contained `cached_json` but no `[email-queue]` or `[edge-cache]` strings and zero `console.log`/`console.error` calls, so Workers Logs had no application output at all. `vite.config.ts` now runs the drop per client module (`dropClientConsole`), leaving Worker logs intact.
- **Email authentication checked against live DNS (2026-10-31)** — apex SPF is `v=spf1 include:_spf.mx.cloudflare.net ~all`; `lm-bounces.dvpyic.dpdns.org` CNAMEs to `bounces.lmta.net`, where Lettermint maintains the Return-Path SPF record, so no root-domain Lettermint include is needed (the earlier "missing SPF include" note was wrong). `lettermint._domainkey` publishes a DKIM key. The remaining gap is DMARC: `p=none` monitors but does not enforce; move to `p=quarantine` after reviewing the `rua` reports.
