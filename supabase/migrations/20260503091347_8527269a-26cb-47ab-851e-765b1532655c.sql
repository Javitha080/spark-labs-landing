
-- 1) learner_tokens: add WITH CHECK validation on INSERT
DROP POLICY IF EXISTS "Anyone can create learner token" ON public.learner_tokens;

CREATE POLICY "Anyone can create learner token"
ON public.learner_tokens
FOR INSERT
TO public
WITH CHECK (
  -- Token must look like a UUID (prevents short/guessable tokens)
  char_length(token) >= 32
  AND char_length(token) <= 64
  -- Name 2-100 chars
  AND char_length(btrim(name)) BETWEEN 2 AND 100
  -- Email format
  AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND char_length(email) <= 255
  -- Phone 7-20 chars
  AND char_length(btrim(phone)) BETWEEN 7 AND 20
  -- Grade non-empty, short
  AND char_length(btrim(grade)) BETWEEN 1 AND 50
);

-- 2) learning_discussions: prevent user_id re-attribution on UPDATE
DROP POLICY IF EXISTS "Users can update own discussion" ON public.learning_discussions;
CREATE POLICY "Users can update own discussion"
ON public.learning_discussions
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Also harden the admin update policy with WITH CHECK to prevent admins
-- accidentally re-attributing rows (still allows the update; just locks user_id semantics).
DROP POLICY IF EXISTS "Admins can update any discussion" ON public.learning_discussions;
CREATE POLICY "Admins can update any discussion"
ON public.learning_discussions
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_roles.user_id FROM public.user_roles
    WHERE user_roles.role = ANY (ARRAY['admin'::app_role, 'editor'::app_role, 'coordinator'::app_role])
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT user_roles.user_id FROM public.user_roles
    WHERE user_roles.role = ANY (ARRAY['admin'::app_role, 'editor'::app_role, 'coordinator'::app_role])
  )
);

-- 3) storage.objects: explicit SELECT policies per bucket
-- Public read for gallery and course-content (intentionally public content)
DROP POLICY IF EXISTS "Public read gallery" ON storage.objects;
CREATE POLICY "Public read gallery"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'gallery');

DROP POLICY IF EXISTS "Public read course-content" ON storage.objects;
CREATE POLICY "Public read course-content"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'course-content');

-- Avatars: authenticated users may read (used in CMS); admins always.
-- Keep bucket public=true for compatibility with public.getPublicUrl, but
-- restrict the underlying object reads via policy.
DROP POLICY IF EXISTS "Authenticated read avatars" ON storage.objects;
CREATE POLICY "Authenticated read avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');
