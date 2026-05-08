## Root causes (confirmed via DB inspection)

**1. "Can't publish post" error** — `blog_posts` RLS policy `Authors can update own posts` has `WITH CHECK (author_id = auth.uid() AND status <> 'published')`. Any non-admin author updating their post to `published` is rejected. Editors/coordinators have only INSERT, no UPDATE policy → they can't update at all.

**2. "Unsupported media type" upload error** — `upload-media` edge function rejects when `file.type` is empty string or `application/octet-stream` (common with iOS HEIC, drag-dropped `.mkv`, some `.mov` files). Server returns `Invalid file type:` with a blank value, surfacing as a confusing "media type" error. Server whitelist also missing some real-world MIME types.

**3. Files don't reach storage in /admin/gallery** — same upload function path; either the MIME rejection above or the `accept` whitelist on the client (`{"video/*": [".mp4",".webm"]}`) blocks `.mov`/`.mkv` before submission.

## Fix plan

### A. Migration: `supabase/migrations/<new>_fix_blog_publish_rls.sql`
- Drop `Authors can update own posts` and recreate without the `status <> 'published'` block.
- Add `Content managers can update any post` policy using `is_content_admin(auth.uid())` for editors/coordinators/admins.

### B. Edge function `supabase/functions/upload-media/index.ts`
- Add extension→MIME fallback: when `file.type` is empty or `application/octet-stream`, derive MIME from filename extension.
- Expand `ALLOWED_MIME_TYPES` to cover `image/heif`, `video/x-msvideo`, `video/3gpp`, `video/ogg`, `audio/mpeg`, `audio/mp4`, `audio/wav`, `audio/ogg`.
- Tier file-size limits by category: images 25 MB, audio 50 MB, video 500 MB, pdf 50 MB. Return precise message: `"File too large: 78 MB. Limit for image is 25 MB."`
- Return clear messages: `"Unsupported media type: <ext|mime>. Allowed: ..."`, include detected extension.
- `console.log` request id, user id, bucket, size, type, ext on every code path for traceability.

### C. Client `src/components/learning/FileUpload.tsx`
- Same MIME/extension fallback before client-side `accept` validation, so iOS/HEIC/MOV files are not pre-rejected.
- Tiered size validation matching the server.
- After `supabase.functions.invoke` failure, fall back to direct `fetch(${VITE_SUPABASE_URL}/functions/v1/upload-media)` with `Authorization` + `apikey`, capturing `response.status` + raw body and surfacing the exact server message.
- Keep existing nested-error parsing; add inline retry button on 5xx/network errors.
- Show explicit toast titles: `"Unsupported media type"`, `"File too large"`, `"Permission denied"`, `"Upload failed"`.

### D. Client `src/pages/admin/GalleryManager.tsx`
- Widen `accept` for video uploads to include `.mov`, `.mkv`, `.m4v`, `.webm`, `.mp4`, `.avi`, `.3gp`.
- Widen image accept with `.heic`, `.heif`, `.avif`, `.svg`.

### E. Client `src/pages/admin/BlogEditor.tsx`
- In the `onSubmit` catch block, detect Postgres `42501` / `row-level security` and show a friendly toast: "You don't have permission to publish. Save as draft and request an admin to publish."
- Don't navigate away on save failure (currently the form persists; verify it stays mounted).

### F. Verification
- Re-query `pg_policy` for `blog_posts` to confirm new policies.
- Call `supabase--curl_edge_functions` POST `/upload-media` with a tiny PNG (and one `application/octet-stream` to confirm extension fallback works) → expect 200 + asset URL.
- `supabase--linter` to confirm no new RLS warnings.

### Files touched
1. `supabase/migrations/<timestamp>_fix_blog_publish_rls.sql` (new)
2. `supabase/functions/upload-media/index.ts`
3. `src/components/learning/FileUpload.tsx`
4. `src/pages/admin/GalleryManager.tsx`
5. `src/pages/admin/BlogEditor.tsx`

No UI redesign, no behavioral change to currently-working uploads. All changes are additive/permissive.