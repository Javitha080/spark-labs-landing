DROP POLICY IF EXISTS "Users can track own analytics" ON public.analytics_events;

CREATE POLICY "Users can track own analytics"
ON public.analytics_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  )
  AND event_type IS NOT NULL
  AND length(event_type) <= 64
  AND event_type ~ '^[a-z0-9_\-\.]+$'
  AND event_type IN (
    'page_view','page_view_duration','session_start','session_end',
    'click','cta_click','scroll','search','signup','login','logout',
    'enrollment_submit','enrollment_view','contact_submit',
    'course_view','course_enroll','course_complete',
    'module_start','module_complete','module_progress',
    'lesson_start','lesson_complete',
    'workshop_view','workshop_register',
    'blog_view','blog_share','blog_like',
    'gallery_view','project_view','event_view',
    'video_play','video_pause','video_complete',
    'download','outbound_click','share',
    'review_submit','discussion_post',
    'achievement_earned','xp_earned'
  )
  AND (page_url IS NULL OR length(page_url) <= 2048)
  AND (session_id IS NULL OR length(session_id) <= 128)
  AND (event_data IS NULL OR pg_column_size(event_data) <= 8192)
);