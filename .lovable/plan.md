## Goal
Activate the already-written secure upload pipeline by applying the pending DB migration and deploying the `upload-media` Edge Function.

## Current state (verified)
- ✅ `supabase/functions/upload-media/index.ts` exists — service-role-based, validates size (10MB) + MIME, SHA-256 dedup via `media_assets`.
- ✅ `src/components/learning/FileUpload.tsx` already invokes `upload-media` via `supabase.functions.invoke` with FormData.
- ✅ `supabase/migrations/20260425231500_secure_storage_and_assets.sql` exists locally but **has not been applied** — DB still shows the insecure `Authenticated Insert` on `media_assets` and `Authenticated users can upload` on `storage.objects`.
- ✅ Avatar uploads in `ProfileSettings.tsx` use a separate `Users can upload their own avatar` policy and will continue to work after the migration (not affected).

## Steps

### 1. Apply the security migration
Run the existing `20260425231500_secure_storage_and_assets.sql` via the migration tool. It will:
- Drop `media_assets` policy `Authenticated Insert` (clients can no longer fake hash records).
- Add admin-only `INSERT` / `UPDATE` / `DELETE` policies on `media_assets` (Edge Function uses service-role and bypasses RLS).
- Drop `storage.objects` upload policies: `Authenticated users can upload` and `Authenticated users can upload course content` — forcing all uploads through the Edge Function.
- Leaves public SELECT policies intact so files remain publicly readable.
- Leaves avatar-specific policies intact so admin profile photo uploads keep working.

### 2. Deploy the `upload-media` Edge Function
Deploy the function so it's reachable from the client. CORS headers and JWT validation are already in place; `verify_jwt` defaults are fine.

### 3. Smoke-test the pipeline
- Invoke `upload-media` with a small test image to confirm: 200 response, public URL returned, row inserted in `media_assets`.
- Re-invoke with the same file → confirm `reused: true` (dedup works).
- Attempt a direct client-side `supabase.storage.from('gallery').upload(...)` from an unauthenticated context → should now be rejected (proves lockdown).

### 4. Verify no regressions
- Confirm `LearningHubManager` / `GalleryManager` / `CourseBuilder` flows (which use `FileUpload.tsx`) still upload correctly.
- Confirm admin avatar upload in `ProfileSettings.tsx` still works (uses untouched avatars-specific policy).

## Out of scope
- No frontend code changes — `FileUpload.tsx` is already aligned with the new Edge Function contract.
- No changes to avatars bucket policies.