

## Fix Email System (Switch to Resend) & Clean Up Database

### Problem Summary
1. **Email is completely broken**: All 3 email edge functions (`send-enrollment-notification`, `send-contact-message`, `send-enrollment-update`) use the Cloudflare Email Routing API, but `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets are not configured. The `RESEND_API_KEY` is already set up.
2. **Duplicate triggers**: Every learning-related trigger exists twice (e.g., `trigger_update_course_rating` and `trg_update_course_rating`), which causes double execution.
3. **deno.json already imports Resend** in `send-enrollment-notification` but the code never uses it.

---

### 1. Switch All 3 Email Functions to Resend

Replace the broken Cloudflare Email API calls with Resend SDK in:
- `supabase/functions/send-enrollment-notification/index.ts`
- `supabase/functions/send-contact-message/index.ts`
- `supabase/functions/send-enrollment-update/index.ts`

Each function will:
- Import Resend from npm (already in `deno.json` for enrollment notification; add to others)
- Replace `sendCloudflareEmail()` with Resend's `resend.emails.send()` using the `RESEND_API_KEY` secret
- Use `from: Deno.env.get('NOTIFICATION_FROM_EMAIL') || 'onboarding@resend.dev'` (the `NOTIFICATION_FROM_EMAIL` secret is already configured)
- Keep all existing HTML templates, validation, CORS, and rate limiting logic intact
- Remove all Cloudflare-specific variables and code

Also add `deno.json` with Resend import to `send-contact-message/` and `send-enrollment-update/` directories.

### 2. Remove Duplicate Database Triggers

Run a migration to drop the duplicate `trg_*` triggers that were created in the audit migration, keeping the original triggers:
- Drop `trg_update_enrollment_progress` (keeps `trigger_update_enrollment_progress`)
- Drop `trg_update_learner_enrollment_progress` (keeps `trigger_update_learner_progress`)
- Drop `trg_update_course_rating` (keeps `trigger_update_course_rating`)
- Drop `trg_update_enrolled_count` (keeps `trigger_update_enrolled_count`)
- Drop `trg_calculate_reading_time` (keeps `calculate_blog_reading_time`)
- Drop `trg_learning_*_updated_at` triggers (keeps `set_learning_*_updated_at`)
- Drop `trg_module_content_blocks_updated_at` (keeps `update_module_content_blocks_updated_at`)

### 3. Update Edge Function JWT Config

All email functions currently have `verify_jwt = true` in `supabase/config.toml`. The `send-enrollment-notification` and `send-contact-message` functions are called from public forms (no auth). These should be set to `verify_jwt = false` with in-code validation where needed. `send-enrollment-update` correctly requires auth (admin-only).

---

### Files to Modify
- `supabase/functions/send-enrollment-notification/index.ts` -- Replace Cloudflare with Resend
- `supabase/functions/send-contact-message/index.ts` -- Replace Cloudflare with Resend
- `supabase/functions/send-enrollment-update/index.ts` -- Replace Cloudflare with Resend
- `supabase/functions/send-contact-message/deno.json` -- Create with Resend import
- `supabase/functions/send-enrollment-update/deno.json` -- Create with Resend import
- `supabase/config.toml` -- Set `verify_jwt = false` for public email functions
- Database migration -- Drop duplicate triggers

