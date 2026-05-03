
-- 1. Remove sensitive tables from realtime publication
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['team_members','teachers','user_roles','users_management','enrollment_notifications','login_attempts','learner_tokens']
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', t);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

-- 2. Teachers: drop public-everyone policy, create public view without email
DROP POLICY IF EXISTS "Public teachers are viewable by everyone." ON public.teachers;

CREATE POLICY "Admins can view teachers"
ON public.teachers FOR SELECT
USING (is_admin(auth.uid()) OR is_content_admin(auth.uid()));

CREATE OR REPLACE VIEW public.teachers_public
WITH (security_invoker = true) AS
SELECT id, name, role, bio, image_url, display_order, created_at
FROM public.teachers;

GRANT SELECT ON public.teachers_public TO anon, authenticated;

-- Allow public read of the safe view via base table policy (security_invoker means underlying RLS applies)
CREATE POLICY "Public can view non-sensitive teacher columns"
ON public.teachers FOR SELECT
USING (true);
-- Note: since email is sensitive, the frontend MUST use teachers_public view.
-- To truly hide email, drop the permissive policy below and rely only on view (admins only via base):
DROP POLICY IF EXISTS "Public can view non-sensitive teacher columns" ON public.teachers;

-- 3. login_attempts: restrict INSERT to authenticated users (was public true)
DROP POLICY IF EXISTS "Authenticated users can log their own attempts" ON public.login_attempts;
CREATE POLICY "Authenticated can log attempts"
ON public.login_attempts FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. learning_achievements: remove client self-grant
DROP POLICY IF EXISTS "Users can insert own achievements" ON public.learning_achievements;
DROP POLICY IF EXISTS "achievements_token_insert" ON public.learning_achievements;

CREATE POLICY "Only admins can insert achievements"
ON public.learning_achievements FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()) OR is_content_admin(auth.uid()));

-- 5. Storage: explicit admin-only INSERT policies on gallery and course-content
DROP POLICY IF EXISTS "Content admins can insert gallery" ON storage.objects;
CREATE POLICY "Content admins can insert gallery"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gallery' AND is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Content admins can insert course content" ON storage.objects;
CREATE POLICY "Content admins can insert course content"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-content' AND is_content_admin(auth.uid()));

-- 6. realtime.messages: restrict to admins only (no general topic broadcast leak)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='realtime' AND tablename='messages' AND policyname='Authenticated can receive realtime') THEN
    DROP POLICY "Authenticated can receive realtime" ON realtime.messages;
  END IF;
END $$;

CREATE POLICY "Admins only can receive realtime"
ON realtime.messages FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()) OR public.is_content_admin(auth.uid()));
