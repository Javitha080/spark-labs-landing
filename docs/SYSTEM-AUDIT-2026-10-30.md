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

---

## 8. Learning-hub completion pass (2026-11-05 addendum)

Closes §5 items 1–3 + the wishlist parity gap; item 4 (duplicated admin managers) left as-is by design, item 5 was already resolved, items 6–7 verified earlier.

### 8.1 Cross-device classroom notes (was §5.2)

- `supabase/migrations/20261105000000_learning_notes_wishlist.sql` creates **`learning_notes`** (`user_id`/`course_id`/`module_id`, `content`, `updated_at` via the shared `update_updated_at_column()` trigger, `UNIQUE(user_id, module_id)` for idempotent upserts, FKs CASCADE into `profiles`/`learning_courses`/`learning_modules`) and **`learning_wishlist`** (`UNIQUE(user_id, course_id)`, no UPDATE path — delete replaces "remove"). Full RLS on both: owner-scoped `(select auth.uid()) = user_id`, `TO authenticated`, one SELECT/INSERT/UPDATE/DELETE policy each.
- `Classroom.tsx` keeps localStorage as the instant cache and upserts into `learning_notes` debounced (800 ms); the outgoing module's note is flushed **before** the switch (sidebar click, next/prev, auto-advance — all funnel through `switchToModule`) and again on unmount. The panel shows real sync state: `Saving… / Synced / Saved on this device only` (the last one when the server write fails — the local draft still protects the session). Emptying a note deletes the server row so cleared notes don't resurrect on another device.
- Client queries are explicitly scoped with `.eq("user_id", student.authUserId)` (RLS already enforces owner rows; the queries stay honest for future policy changes).

### 8.2 Both dead achievements now fire (was §5.1)

- `src/lib/gamification.ts` gains pure, unit-tested predicates: `shouldAwardSpeedLearner` (≥3 `learning_progress.completed_at` timestamps within 24 h of `learning_enrollments.enrolled_at`, window capped at now so late backfills can't retro-fit it) and `shouldAwardComebackKid` (≥3 calendar-day gap from `learning_user_stats.last_activity_date`; first-ever activity is not a comeback). 12 new vitest cases in `src/lib/gamification.test.ts` (75 total green).
- `Classroom.handleToggleComplete` reads the **fresh trigger-recomputed** enrollment + progress rows (`.eq("user_id", …)` on both) instead of the stale closure list, then awards `speed_learner` when the predicate holds; `comeback_kid` is computed in `GamificationContext.recordActivity` **before** the stats upsert overwrites `last_activity_date`, and awarded after the busy-lock releases (same pattern as the streak badges, `awardAchievement` dedupes).

### 8.3 Achievements locker (was §5.3)

- MyLearning's old "chips you already have" strip is now a full 12-badge grid: unlocked badges show icon + earned date, locked ones show 🔒 + their earn hint (new `hint` field on every definition) and XP — the card doubles as a goals page with the `n of 12 unlocked · XP` counter.

### 8.4 Wishlist (Udemy parity)

- `useWishlist` hook (`src/hooks/useWishlist.ts`): owner-scoped read with a joined course row, optimistic toggle (`toggle`/`has`/`pending`), `23505` duplicate treated as already-saved, guest taps route to `/student/login` with a toast, failures revert and toast.
- Surfaces — thumbnail heart on hub course cards (top-right, `preventDefault`+`stopPropagation`, hidden on completed courses), "Add to wishlist" button on CourseDetail's sidebar, and a dedicated **Wishlist tab** in My Learning with remove buttons keyed to per-row pending state.
- Wishlist rows are tolerable to unpublished campaigns: the hook filters rows whose joined course is gone (deleted ones cascade in SQL anyway).

### 8.5 Honest hero stats

- LearningHub's "500+ Students / 50+ Projects / 100+ Skills" fabrication is replaced by live counts from the same fetch: published courses, **published lectures** (`head`-count on `learning_modules`), published workshops, published resources. Public RLS covers exactly those rows, so the numbers are correct for any visitor.

### 8.6 CMS dead code (exploration finding)

- `LearningHubManager.tsx` rewritten as a slim shell (~100 lines of dead imports/types were left over from the tab extraction, plus the orphaned `QRModal`/`ContentIcon` helpers); `CoursesTab.tsx` lost the trailing unused `CourseBuilder` import. Zero behavior change.

### 8.7 Gates

- `vitest run` 12 files / **75 tests passed**; `tsc -b` clean (app/node/worker); lint **ratchet 0 errors / 0 warnings** (baseline 0, not raised). `npm run build` re-run after the full change set — final gate status listed in the closure report.

### 8.8 Migration apply (pending, by hand as in previous passes)

- `20261105000000_learning_notes_wishlist.sql` **is not yet applied** to the live DB (no Supabase CLI/MCP in this environment; repo convention is Dashboard SQL editor → paste → run, newest files first). It is fully re-runnable (`IF NOT EXISTS` / `DROP ... IF EXISTS`), so `supabase db push` converges later without conflict.
- **Frontend deploy sequencing:** the client tolerates the table being absent (note sync degrades to `Saved on this device only`, wishlist reads fail soft), but **apply the migration before announcing notes cross-device sync or the wishlist tab**, and run the Supabase types regeneration (`supabase gen types`) once linked — the two hand-added blocks in `src/integrations/supabase/types.ts` (`learning_notes`, `learning_wishlist`, exact generated shape) are marked to converge then.
- No D1 changes; no worker changes.

---

## 9. Learning-hub phase 2 — quiz engine, announcements, notifications (2026-11-06 addendum)

Closes the remaining Udemy-parity gaps from the student + CMS audits. Second bundled migration `20261106000000_learning_quiz_announcements_notifications.sql` (apply 20261105000000 first, then this one; both re-runnable).

### 9.1 DB (migration 20261106)

- **`learning_quiz_questions`** — `module_id` FK CASCADE into `learning_modules`, `question`, jsonb `options` (CHECK: jsonb array), `correct_index`, `explanation`, `display_order`. Formative by design: SELECT open to `authenticated` (options must be readable to answer them), write gated `is_content_admin(auth.uid())` via the dual-RBAC bridge (20260308000001).
- **`learning_announcements`** — per-course, `user_id` nullable (SET NULL on author deletion), `is_published` drafts vs published; SELECT `is_published OR is_content_admin`, write content-admin-only.
- **`learning_notifications`** — student feed (`type` union `qa_reply|review_reply|announcement`, `title/body/link/course_id`, `is_read`). Owner-scoped RLS for SELECT/UPDATE/DELETE; **no client INSERT policy** — every insert lives in the SECURITY DEFINER triggers below, so nothing can be forged client-side. Partial index on `(user_id) WHERE is_read = FALSE`.
- **Three triggers write the feed**: `trigger_notify_discussion_reply` (parent-thread owner is notified on any reply, never self), `trigger_notify_review_reply` (fires once, on `admin_reply` going blank-to-non-blank), `trigger_announcement_fanout` (fan-out snapshot to currently-enrolled students on INSERT with `is_published=true` — flipping an existing draft to published does **not** re-notify, surfaced in the admin composer UI).
- **Admin certificates**: `learning_certificates` gains `FOR SELECT` + `FOR UPDATE` content-admin policies (view all, revoke by writing `revoked_at`; reinstatement = back to NULL). Student owner-only SELECT and gated INSERT from 20261030 are untouched; `completed_at` still set only by the progress trigger.
- **Realtime**: `learning_announcements` + `learning_notifications` added to `supabase_realtime` publication via the IF-NOT-EXISTS DO-block idiom (20260316172403 precedent).

### 9.2 Student surfaces

- **Quiz renderer** (`QuizRenderer.tsx`, safe pre-migration — empty quizzes show "no questions yet"): Classroom branches `content_type === "quiz"` for the first time (it previously rendered nothing); one question per screen, per-answer reveal + explanation, score card at 70% pass (`src/lib/quiz.ts`, 9 unit tests), "Mark as complete" funnels through `handleToggleComplete` so achievements/auto-advance/certificates keep one source of truth. Keyed remount per module (no prop-watch reset effect).
- **Playback speed + PiP**: 0.75-2x chips + Picture-in-Picture toggle bar under the direct-video player (embeds keep provider players), persisted as `spark_playback_rate` in localStorage.
- **Announcements**: classroom header megaphone with badge + dialog list (realtime-refreshed via `useRealtimeSync`).
- **Notification bell** (`NotificationsBell` + `useLearningNotifications`): realtime `learning_notifications` channel filtered by `user_id`, unread badge, popover feed, open → markRead + navigate `link`; surfaced on LearningHub (My Learning row) and MyLearning (actions row), auth-gated render.
- **CourseDetail reviews**: own review prefills the form (`maybeSingle` on user+course), becomes "Your Review" with Update/Delete (RLS already allowed user UPDATE/DELETE), list gains newest/highest/lowest sort + "You" badge + Edit affordance.
- **Certificate page**: revoked certificates (an admin writes `revoked_at` via the new UPDATE policy) render a revoked notice instead of the sheet; Print applies only to the valid state. The public `/verify` flow already handled revocation (20261031).

### 9.3 CMS surfaces

- **AnnouncementsTab** (new): course picker, draft-or-publish composer with honest copy about the one-time fan-out semantics, history list with publish/unpublish, edit and delete.
- **CertificatesTab** (new): ledger with learner/course/code search + valid/revoked filter, Revoke (AlertDialog, writes `revoked_at`) and Reinstate (back to NULL); depends on the new admin policies.
- **Quiz builder**: `QuizQuestionEditor` inside Edit Module when type=quiz (+ a `ListChecks` row shortcut on quiz modules): options radio-selects the correct one, add/remove options (2-6), explanation, Reorder ordering, delete confirm; validation via `validateQuizDraft`.
- **ClassroomTab learner drilldown**: learner names open a per-module progress dialog (completed / paused at m:ss / not started, completion bar from `learning_progress`; admin read existed since 20260220).
- **CourseManagerTab Engagement subtab**: per-module completion % over enrolled learners (on-demand fetch), flags stall-out modules.
- **CoursesTab duplicate now copies the whole curriculum**: sections (old-to-new id map) -> modules remapped to new section ids -> content blocks + quiz questions remapped to new module ids; partial failures surface as toasts instead of silent truncation. Uses batch-insert `.select("id")` ordering (rows return in insertion order).
- **DiscussionsTab**: reply dialog notes that posting sends the student an in-app notification (triggered server-side).

### 9.4 Gates

- `vitest run` **13 files / 84 tests passed** (75 -> 84: 9 new quiz tests); `tsc -b` exit 0; lint ratchet **0 <= 0** (baseline untouched); new `set-state-in-effect` reports resolved with the repo single-line fetch-effect disable idiom, keyed remount instead of a prop-watch reset, and hoisted primitive deps in the notifications hook. `npm run build` result in the closure report.

### 9.5 Migration apply (pending, by hand — same convention)

- Apply order: **`20261105000000_learning_notes_wishlist.sql` first, then `20261106000000_learning_quiz_announcements_notifications.sql`** (Dashboard SQL editor; both fully re-runnable). The quiz/announcement UI is live-safe before the migration (empty quiz placeholder), but **notifications, announcements and the certificates admin primitives exist only after 20261106 applies** — apply before announcing them.
- Rerun `supabase gen types` when linked; approximate generated blocks for `learning_announcements` / `learning_notifications` / `learning_quiz_questions` were hand-added to `src/integrations/supabase/types.ts` alongside the phase-1 ones, marked to converge.
- No worker changes from phase 2 (announcements/quiz ride the existing SPA + Supabase client); no D1 changes.

---

## 10. Phase 3 addendum (2026-11-08 — deferred-parity build-out)

Phase 3 closed the remaining Udemy-parity gaps queued from the phase-2 pass. Everything below passed the standard gates (`vitest run` **16 files / 105 tests** — floor raised from 99; `tsc -b` exit 0; lint ratchet **0 ≤ 0**; production build green).

### 10.1 Shipped

- **Classroom Q&A (`20261105`)** — real discussion threads independent of the landing-site content system: `ClassroomQAPanel` (course-wide, pinned-first, replies grouped in one `.in("parent_id")` fetch, no author names shown, "Instructor" badge on `is_instructor_answer`, inline reply forms, realtime while open). Asking contributes via the `qa_contributor` achievement.
- **Free-preview gating (`20261107`)** — `learning_modules.is_preview` presented on CourseDetail (Preview badge, clickable title, preview player dialog for YouTube/Vimeo/Instagram/direct). Documented honestly: **presentation-level gate, not a secrets boundary** — the published-module RLS policy already exposes `content_url` to anyone reading published rows, so preview ≠ encryption. CourseBuilder gained the Free preview Switch; workers/prerender unaffected.
- **Instructor public profiles (`20261108`)** — instructors are a **derived entity** (no `instructor_id` FK exists; `learning_courses.instructor` is free text): slug = `slugify_text(instructor)` over published courses, resolved server-side by SECURITY DEFINER RPCs `get_public_instructor_courses` / `get_public_instructor_slugs` (13-col rows, `SET search_path = public`, granted to anon+authenticated). `/learning-hub/instructor/:slug` (public, bot-prerender via `injectInstructorPrerender` + `loadInstructorSeoMeta` with 5-min D1 cache, ProfilePage + Person mainEntity + hasCourse ItemList JSON-LD, robot-branch regex before the generic prerender fallback). `/sitemap-instructors.xml` generated by the Worker; `robots.txt` references it. Non-ASCII-only names collapse to empty slugs → keep the name unlinked and are dropped from the sitemap. Client `slugifyName` (src/lib/sanitize.ts) mirrors SQL `slugify_text`.
- **Catalog filters** — language (containment match over admin free-text, options derived from live data, max 8) and duration buckets (Udemy short <2h / medium 2-6h / long 6h+). Parsing lives in `src/lib/courseDuration.ts` with unit tests (out of the page file — react-refresh only-export-components, and for direct testing).
- **Enrollment archive (`20261109`)** — `learning_enrollments.is_archived` + owner-RLS covered end-to-end by the existing policies (SELECT reads, UPDATE `USING(auth.uid() = user_id)`, WITH CHECK defaults to USING). My Learning gets an Archive tab; archived rows drop out of all learning tabs and the resume card but stay enrolled/counted. Flags are read via a student-local `(course_id, is_archived)` query (auth bootstrap never depends on the column — degrades to "nothing archived" pre-migration) merged with optimistic local overrides; no StudentAuthContext changes.
- **Notification emails (`20261110`)** — the SECURITY DEFINER feed triggers (announcement fanout, Q&A reply, review response) now have an email shadow: Worker **cron `*/10 * * * *`** polls `learning_notifications WHERE email_status='pending'` (service-role client, join `courses(title)` + `profiles!inner(email)`, 100/batch), queues `learning_notification` emails (stable `idempotencyKey: learnmail:<id>` — provider dedupes a crash between send and mark), then marks `sent`/`skipped` (no mailable address). Failed sends stay pending → next tick. Old scheduler guarantee: the scheduled handler never throws (log boundary). The DLQ + `max_retries: 3` queue semantics still apply to each queued message.
- **Q&A insert bug fixed on the way**: `learning_discussions` has **no `author_name` column** — two ghost-column inserts in CourseDetail (PGRST204) removed, plus two `as any` casts.

### 10.2 Open items (deferred, documented deliberately)

- **Course collections (named groups)** — the planned "Archive & Collections" item is partially shipped (archive above); collections need their own schema (a `learning_collections` + membership table), a management UI and per-group ordering. Deferred as its own feature; not started.
- **Type convergence points** — `StudentAuthContext` intentionally keeps its `is_archived`-free enrollment select (auth bootstrap must not depend on new columns); the archive flag converges through the hand-added blocks in `src/integrations/supabase/types.ts` (`learning_modules.is_preview`, `learning_enrollments.is_archived`, `learning_notifications.email_status`) alongside the phase-1/2 approximations.
- **Per-student email preferences** — shipped 2026-11-12 (§10.4).
- **Dashboard SQL editor apply of all pending migrations (all re-runnable, apply in order):**
  1. `20261105000000_learning_notes_wishlist.sql`
  2. `20261106000000_learning_quiz_announcements_notifications.sql`
  3. `20261107000000_learning_module_preview.sql`
  4. `20261108000000_public_instructor_rpc.sql`
  5. `20261109000000_learning_enrollment_archive.sql`
  6. `20261110000000_learning_notification_email.sql`
  7. `20261111000000_learning_notifications_admin_email.sql` (new — lets `/api/notify-emails/tick` run under an admin JWT; see §10.3)
  8. `20261112000000_student_account_email_preferences.sql` (new — per-student email opt-out; see §10.4)
  - The UI for each item ships live-safe (archive degrades to nothing-hidden; emails simply remain pending until 20261110 applies), but features only activate after their migration applies.
- Rerun `supabase gen types` when linked to converge the hand-added blocks (`learning_modules.is_preview`, `learning_enrollments.is_archived`, `learning_notifications.email_status`, instructor RPC Functions). No D1 changes in phase 3.

### 10.3 RLS-native Worker addendum (2026-11-11 — Lovable-managed DB constraint)

**Discovery.** The production database is **Lovable-managed** (Supabase project `gtwqjuisdmbqlsjlatyj`); the operator has no project ownership — only dashboard SQL-editor access, no key rotation. `wrangler secret list` on the deployed Worker shows only `LETTERMINT_API_KEY` + `TURNSTILE_SITE_KEY` — **no `SUPABASE_SERVICE_ROLE_KEY`**. Because `getSupabase()` refuses to fall back in production, every protected `/api/*` route (schedule writes, `/api/activities`, cache invalidation, IndexNow, enrollment email sends) returned 503, and the 10-minute notification-email cron logged failures each tick. The admin CMS was largely unaffected (it is browser + RLS by design, incl. `get_cms_role`), as was the whole public site (`getPublicSupabase`). `/api/upload-media` and `/api/verify-turnstile` turned out to have no frontend callers.

**Fix — dual-mode `authMiddleware`.** When `resolveServiceRoleKey(env)` yields a key (self-hosted DB later), behavior is exactly as before (service-role, RLS bypass). Without one, the middleware builds a publishable-key client carrying **the calling admin's own JWT** and stores it in context (`c.get("supabase")`); handlers (schedule CRUD, `/api/activities`, notification email drain) run RLS-natively under the same policies the browser CMS already passes. `getPublicSupabase(env, authorization?)` grew the optional header. The cron keeps service-role semantics and stays failure-safe; a new **`POST /api/notify-emails/tick`** (`learning_hub` permission) runs the identical drain (`sendPendingNotificationEmails`, shared code) under the admin JWT, returning `{found, sent, skipped}`. Publishing an announcement now triggers a best-effort drain right after the fan-out trigger (AnnouncementsTab), and toggling an announcement back to published does too — so emails deliver without the service key.

**Operator SQL required for the tick route (additive, re-runnable):**
- `20261111000000_learning_notifications_admin_email.sql` — CMS-admin SELECT + UPDATE policies on `learning_notifications` (`is_admin(...) OR is_content_admin(...)`; owners' policies unchanged, INSERT-forge protection preserved). Without it the tick route fetch fails → 500; announcements still post and fan out in-app.

**Also fixed while here:** production had a secret named `TURNSTILE_SITE_KEY` (the public key) while the code reads `TURNSTILE_SECRET_KEY` → server-side bot verification silently off (worker only proceeds unverified because the secret is unset; forms still send). Correct it via `wrangler secret put TURNSTILE_SECRET_KEY` + `wrangler secret delete TURNSTILE_SITE_KEY` — entirely Cloudflare-side.

**Open item:** self-hosted Supabase runbook (own project → run migrations in SQL editor → copy data incl. `auth.users` — SQL editor runs as postgres → swap `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` in `wrangler.json` → `wrangler secret put SUPABASE_SERVICE_ROLE_KEY`) — documented in `docs/DEPLOYMENT.md`; it also unlocks `supabase gen types` and true cron retries.

### 10.4 Email preferences addendum (2026-11-12 — per-student opt-out)

- **Migration (hand-apply via SQL editor, re-runnable):** `20261112000000_student_account_email_preferences.sql` — `student_accounts.email_notifications BOOLEAN NOT NULL DEFAULT TRUE`. No new RLS policies: `students_read_own` / `students_update_own` (20260519) already cover owner access.
- **Drain respects it:** `sendPendingNotificationEmails` batches a `student_accounts (auth_user_id, email_notifications)` lookup per drain and skips opted-out students (rows marked `skipped`, never retried; re-enabling applies to NEW notifications only). Absence of a `student_accounts` row **fails open** (staff profiles without accounts keep receiving), and a lookup error also **fails open** (logged) so a partial-visibility reader (e.g. content_creator RLS on `admins_read_all_students`) can never silently drop everyone's emails.
- **UI:** `/student/dashboard` preference card (Switch) — reads/writes `student_accounts.email_notifications` through the student's own JWT, optimistic toggle + rollback with `toast.error` on failure. Same "auth bootstrap never depends on the new column" rule as the archive: a pre-migration account reads no column → treated as opted in.
- `src/integrations/supabase/types.ts`: `email_notifications` hand-added to the `student_accounts` Row/Insert/Update blocks (converges on the next `supabase gen types`).

### 10.5 Email bounce + newsletter hardening addendum (2026-11-07 — Nov 5 `521` follow-up; backfilled later in file order)

Follow-up on the Nov 5 admin-alias hard bounce (`521 5.3.0 upstream`, trace `TjZbBKxdOMtA`) — the Nov 5 incident was confirmed a **one-off transient upstream error** at the CF→Gmail forwarding hop (full differential repro delivered on all three paths, see `docs/DEPLOYMENT.md § Email delivery`). The code/config changes below make its side-effects visible and stop related silent failures:

- **Route pinning (root-cause class):** `email-consumer.ts` now sends `route: "outgoing"` on every Lettermint call. Routeless sends fell back to the project's **broadcast** default route — wrong cargo class for transactional notifications and the route scoping of the `admin@dvpyic.dpdns.org` `hard_bounce` suppression (created 2026-05-23 by an earlier bounce; it silently skipped alias mail as long as sends rode broadcast). Suppression removed via MCP and the project `default_route_id` flipped to the transactional route; the code-side pin guards against future dashboard drift. Unit-tested (`pins sends to the transactional route…`).
- **Silent-ack 401 fix (was §7-adjacent class):** the consumer treated `401` from Lettermint like any non-retryable error and `ack()`'d the queue message — a rotated/invalid token silently dropped every queued mail (this happened live: `.env`'s token had gone stale with nobody noticing, it 401'd in diagnostics). Now 401/403 raise `configError` → dead-letter queue instead. Tested.
- **Delivery-events webhook:** new `POST /api/lettermint/webhook` + `src/worker/webhooks/lettermint.ts` (Stripe/Svix-scheme HMAC verify via Web Crypto, raw-body only, 300 s replay tolerance, event → structured log + PII-free Analytics Engine blob). Secret: `LETTERMINT_WEBHOOK_SECRET` (set on the Worker + `.dev.vars`). Provider side: project-scope webhook "YICDVP worker events" → 9 bounce/complaint/suppression/delivery events, live-deliveries only. Tests cover signature vectors, tamper, replay window, and log routing. Default behavior until deployed: webhook events 404 with no retry storm (attempt 1 only).
- **Newsletter persistence:** `POST /api/newsletter-subscribe` now upserts into `public.newsletter_subscribers` before the admin notification is queued (`stored` flag in response; DB failure degrades to email-only, logged). Migration `supabase/migrations/20261113000000_newsletter_subscribers.sql` — **hand-apply in the SQL editor** (re-runnable): unique email index, RLS enabled with zero policies + explicit `REVOKE` from `anon`/`authenticated` (service-role only), `update_updated_at_column()` trigger. Footer re-gained its newsletter form (desktop stage + `<lg` stacked variant, one Turnstile widget per page load via the `isStageLayout` load-time split), posting the same `X-Turnstile-Token` convention as the contact form.
- **Test/verify state:** 117 vitest tests / 17 files green (incl. 9 new webhook-signature + consumer cases; `.dev.vars`-driven jsdom now polyfills Node `webcrypto` for `crypto.subtle`), lint ratchet 0/0, `npm run check` (types + build + wrangler dry-run) clean.
- **Remaining operator action (SQL editor):** apply `20261113000000_newsletter_subscribers.sql`. Optional hygiene: revoke superseded Lettermint project token "spark-labs-landing-worker (prod)" (keeping v2), and consider a `dmarc@` routing rule — DMARC `rua/ruf` reports land on the catch-all, whose action is **drop**, so the reports never arrive.

