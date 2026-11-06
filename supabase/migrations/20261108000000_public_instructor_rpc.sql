-- Udemy-style public instructor profile pages (/learning-hub/instructor/:slug).
--
-- Courses only carry a free-text `instructor` field (no instructor_id FK), so
-- the "instructor entity" is derived: slug = slugified instructor name.
-- `slugify_text` defines the canonical rule; the client's page link uses the
-- same lowercase/condense-hyphens algorithm.
--
-- SECURITY DEFINER so a visitor can read the aggregate without any SELECT
-- right on learning_courses beyond the publish policy — the function reads
-- only is_published rows. search_path pinned per the 20261031120000
-- hardening convention.
--
-- Re-runnable: CREATE OR REPLACE + idempotent GRANTs.

CREATE OR REPLACE FUNCTION public.slugify_text(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT trim(btrim(lower(regexp_replace(trim(coalesce(raw, '')), '[^a-z0-9]+', '-', 'gi')), '-'), '-')
$$;

CREATE OR REPLACE FUNCTION public.get_public_instructor_courses(p_slug text)
RETURNS TABLE (
    instructor_name text,
    instructor_bio text,
    instructor_avatar text,
    course_id uuid,
    course_title text,
    course_slug text,
    course_thumbnail text,
    course_level text,
    course_language text,
    course_duration text,
    rating_avg numeric,
    rating_count integer,
    enrolled_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH matched AS (
        SELECT *
        FROM public.learning_courses
        WHERE is_published = true
          AND public.slugify_text(instructor) = public.slugify_text(p_slug)
    ),
    lead AS (
        -- The instructor identity comes from the course that actually names
        -- them; oldest row wins so the displayed name/bio is stable.
        SELECT instructor, instructor_bio, instructor_avatar
        FROM matched
        WHERE instructor IS NOT NULL
        ORDER BY created_at ASC NULLS LAST
        LIMIT 1
    )
    SELECT
        lead.instructor,
        lead.instructor_bio,
        lead.instructor_avatar,
        m.id,
        m.title,
        m.slug,
        m.thumbnail_url,
        m.level,
        m.language,
        m.duration,
        m.rating_avg,
        m.rating_count,
        m.enrolled_count
    FROM matched m
    CROSS JOIN lead
    ORDER BY m.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_instructor_courses(text) TO anon, authenticated;

-- Distinct instructor slugs for the dynamic /sitemap-instructors.xml.
CREATE OR REPLACE FUNCTION public.get_public_instructor_slugs()
RETURNS TABLE (instructor_slug text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT DISTINCT public.slugify_text(instructor)
    FROM public.learning_courses
    WHERE is_published = true AND instructor IS NOT NULL
$$;

GRANT EXECUTE ON FUNCTION public.get_public_instructor_slugs() TO anon, authenticated;
