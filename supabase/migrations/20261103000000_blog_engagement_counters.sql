-- Denormalised engagement counters for blog_posts.
--
-- The durable audit trail stays in analytics_events (RLS-gated, written by the
-- reader's client). These columns are a cheap read model so listings can show
-- and sort by views, and readers cannot write them directly: the Worker's
-- /api/blog/:slug/event endpoint (service-role) is the only caller of the
-- increment RPC below.

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares integer NOT NULL DEFAULT 0;

-- Seed from the audit trail. analytics_events rows are already roughly
-- one-per-reader-session (the client de-duplicates before inserting), so plain
-- counts are the best available estimate. Slug lives at event_data->>'slug'.
UPDATE public.blog_posts p
SET views  = COALESCE(sub.views, 0),
    shares = COALESCE(sub.shares, 0)
FROM (
  SELECT
    e.event_data ->> 'slug' AS slug,
    COUNT(*) FILTER (WHERE e.event_type = 'blog_view')  AS views,
    COUNT(*) FILTER (WHERE e.event_type = 'blog_share') AS shares
  FROM public.analytics_events e
  WHERE e.event_type IN ('blog_view', 'blog_share')
    AND e.event_data ->> 'slug' IS NOT NULL
  GROUP BY 1
) sub
WHERE p.slug = sub.slug;

-- Atomic increments for published posts. SECURITY DEFINER so anon readers can
-- bump the counters without any direct table permission; the type whitelist
-- keeps arbitrary column names out of reach.
CREATE OR REPLACE FUNCTION public.increment_blog_engagement(p_slug text, p_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_slug IS NULL OR length(p_slug) = 0 OR length(p_slug) > 200 THEN
    RAISE EXCEPTION 'invalid slug';
  END IF;

  IF p_type = 'view' THEN
    UPDATE public.blog_posts SET views  = views  + 1 WHERE slug = p_slug;
  ELSIF p_type = 'share' THEN
    UPDATE public.blog_posts SET shares = shares + 1 WHERE slug = p_slug;
  ELSE
    RAISE EXCEPTION 'invalid engagement type';
  END IF;
END;
$$;

-- Explicit, auditable surface: nothing else may call this (PUBLIC EXECUTE is
-- the Postgres default for new functions).
REVOKE EXECUTE ON FUNCTION public.increment_blog_engagement(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_blog_engagement(text, text)
  TO anon, authenticated, service_role;
