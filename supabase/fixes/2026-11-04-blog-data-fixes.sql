-- ─── Manual data fixes for blog_posts — run in the Supabase SQL Editor ───────
-- Date: 2026-11-04. Found by the production audit of the new blog system.
-- Not a migration: these are one-off corrections of editorial data quality.

-- 1) `what-is-arduino` stores the author as the literal string "null", which
--    renders as an ugly byline ("N null" + initials N) on the listing cards.
--    Match the peer convention (Tinkercad posts are authored by Admin).
UPDATE public.blog_posts
SET author_name = 'Admin'
WHERE slug = 'what-is-arduino'
  AND lower(author_name) = 'null';

-- 2) static.vecteezy.com hotlinks: those URLs are hotlink-protected and answer
--    HTTP 403 to every embed, so three covers (blog cards + article header)
--    and two author avatars (the /news page renders author_image_url directly)
--    fail to load for every visitor. Nulling makes the UI fall back to the
--    built-in gradient cover (Cover component) and the initials avatar.
--    Replace them with real uploads through the admin CMS when ready.
UPDATE public.blog_posts
SET author_image_url = NULL
WHERE author_image_url ILIKE '%vecteezy%';

UPDATE public.blog_posts
SET cover_image_url = NULL
WHERE cover_image_url ILIKE '%vecteezy%';

-- ─── Sanity check: run after the updates ─────────────────────────────────────
-- SELECT slug, author_name,
--        author_image_url IS NULL AS avatar_cleaned,
--        cover_image_url IS NULL  AS cover_cleaned
-- FROM public.blog_posts
-- WHERE status = 'published'
-- ORDER BY published_at DESC;
