-- Fix wide-open RLS policies on Learning Hub tables.
-- Previously: INSERT/UPDATE/DELETE used USING(true) or WITH CHECK(true)
-- allowing ANY authenticated user to modify courses, modules, etc.
-- Now: Restricted to admin/editor/coordinator via is_content_admin().

-- ═══════════════════════════════════════════
-- learning_courses
-- ═══════════════════════════════════════════
DROP POLICY IF EXISTS "Admins can view all courses" ON public.learning_courses;
CREATE POLICY "Content admins can view all courses"
  ON public.learning_courses FOR SELECT
  TO authenticated
  USING (public.is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert courses" ON public.learning_courses;
CREATE POLICY "Content admins can insert courses"
  ON public.learning_courses FOR INSERT
  TO authenticated
  WITH CHECK (public.is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update courses" ON public.learning_courses;
CREATE POLICY "Content admins can update courses"
  ON public.learning_courses FOR UPDATE
  TO authenticated
  USING (public.is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete courses" ON public.learning_courses;
CREATE POLICY "Content admins can delete courses"
  ON public.learning_courses FOR DELETE
  TO authenticated
  USING (public.is_content_admin(auth.uid()));

-- ═══════════════════════════════════════════
-- learning_modules
-- ═══════════════════════════════════════════
DROP POLICY IF EXISTS "Admins can view all modules" ON public.learning_modules;
CREATE POLICY "Content admins can view all modules"
  ON public.learning_modules FOR SELECT
  TO authenticated
  USING (public.is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert modules" ON public.learning_modules;
CREATE POLICY "Content admins can insert modules"
  ON public.learning_modules FOR INSERT
  TO authenticated
  WITH CHECK (public.is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update modules" ON public.learning_modules;
CREATE POLICY "Content admins can update modules"
  ON public.learning_modules FOR UPDATE
  TO authenticated
  USING (public.is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete modules" ON public.learning_modules;
CREATE POLICY "Content admins can delete modules"
  ON public.learning_modules FOR DELETE
  TO authenticated
  USING (public.is_content_admin(auth.uid()));

-- ═══════════════════════════════════════════
-- learning_sections
-- ═══════════════════════════════════════════
DROP POLICY IF EXISTS "Admins can view all sections" ON public.learning_sections;
CREATE POLICY "Content admins can view all sections"
  ON public.learning_sections FOR SELECT
  TO authenticated
  USING (public.is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert sections" ON public.learning_sections;
CREATE POLICY "Content admins can insert sections"
  ON public.learning_sections FOR INSERT
  TO authenticated
  WITH CHECK (public.is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update sections" ON public.learning_sections;
CREATE POLICY "Content admins can update sections"
  ON public.learning_sections FOR UPDATE
  TO authenticated
  USING (public.is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete sections" ON public.learning_sections;
CREATE POLICY "Content admins can delete sections"
  ON public.learning_sections FOR DELETE
  TO authenticated
  USING (public.is_content_admin(auth.uid()));

-- ═══════════════════════════════════════════
-- learning_workshops
-- ═══════════════════════════════════════════
DROP POLICY IF EXISTS "Admins can view all workshops" ON public.learning_workshops;
CREATE POLICY "Content admins can view all workshops"
  ON public.learning_workshops FOR SELECT
  TO authenticated
  USING (public.is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert workshops" ON public.learning_workshops;
CREATE POLICY "Content admins can insert workshops"
  ON public.learning_workshops FOR INSERT
  TO authenticated
  WITH CHECK (public.is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update workshops" ON public.learning_workshops;
CREATE POLICY "Content admins can update workshops"
  ON public.learning_workshops FOR UPDATE
  TO authenticated
  USING (public.is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete workshops" ON public.learning_workshops;
CREATE POLICY "Content admins can delete workshops"
  ON public.learning_workshops FOR DELETE
  TO authenticated
  USING (public.is_content_admin(auth.uid()));

-- ═══════════════════════════════════════════
-- learning_resources
-- ═══════════════════════════════════════════
DROP POLICY IF EXISTS "Admins can view all resources" ON public.learning_resources;
CREATE POLICY "Content admins can view all resources"
  ON public.learning_resources FOR SELECT
  TO authenticated
  USING (public.is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert resources" ON public.learning_resources;
CREATE POLICY "Content admins can insert resources"
  ON public.learning_resources FOR INSERT
  TO authenticated
  WITH CHECK (public.is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update resources" ON public.learning_resources;
CREATE POLICY "Content admins can update resources"
  ON public.learning_resources FOR UPDATE
  TO authenticated
  USING (public.is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete resources" ON public.learning_resources;
CREATE POLICY "Content admins can delete resources"
  ON public.learning_resources FOR DELETE
  TO authenticated
  USING (public.is_content_admin(auth.uid()));

-- ═══════════════════════════════════════════
-- module_content_blocks
-- ═══════════════════════════════════════════
DROP POLICY IF EXISTS "Admins can read all blocks" ON public.module_content_blocks;
CREATE POLICY "Content admins can read all blocks"
  ON public.module_content_blocks FOR SELECT
  TO authenticated
  USING (public.is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert blocks" ON public.module_content_blocks;
CREATE POLICY "Content admins can insert blocks"
  ON public.module_content_blocks FOR INSERT
  TO authenticated
  WITH CHECK (public.is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update blocks" ON public.module_content_blocks;
CREATE POLICY "Content admins can update blocks"
  ON public.module_content_blocks FOR UPDATE
  TO authenticated
  USING (public.is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete blocks" ON public.module_content_blocks;
CREATE POLICY "Content admins can delete blocks"
  ON public.module_content_blocks FOR DELETE
  TO authenticated
  USING (public.is_content_admin(auth.uid()));

-- ═══════════════════════════════════════════
-- activity_log - restrict INSERT to content admins
-- (service_role bypasses RLS, so edge functions still work)
-- ═══════════════════════════════════════════
DROP POLICY IF EXISTS "Anyone can insert activity logs" ON public.activity_log;
CREATE POLICY "Content admins can insert activity logs"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_content_admin(auth.uid()));
