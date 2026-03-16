DO $$
DECLARE
  _tables text[] := ARRAY[
    'events', 'blog_posts', 'enrollment_submissions', 'enrollment_notifications',
    'activity_log', 'analytics_events', 'content_blocks', 'user_roles',
    'users_management', 'roles', 'role_permissions', 'permissions',
    'learning_enrollments', 'learner_course_enrollments', 'learning_modules',
    'learning_sections', 'learning_workshops', 'learning_resources',
    'learning_reviews', 'learning_progress', 'learner_progress',
    'learning_discussions', 'module_content_blocks', 'login_attempts', 'profiles'
  ];
  _t text;
BEGIN
  FOREACH _t IN ARRAY _tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = _t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', _t);
    END IF;
  END LOOP;
END;
$$;