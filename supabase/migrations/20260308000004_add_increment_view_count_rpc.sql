-- Atomic view count increment to prevent race conditions.
-- Previously the frontend read the count, incremented in JS, then wrote it back.
-- Two simultaneous visitors could lose a count.

CREATE OR REPLACE FUNCTION public.increment_course_view_count(p_course_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.learning_courses
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_course_id;
$$;

-- Allow both anonymous and authenticated users to increment view counts
GRANT EXECUTE ON FUNCTION public.increment_course_view_count(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_course_view_count(uuid) TO authenticated;
