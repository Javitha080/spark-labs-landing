-- Add missing indexes for frequently filtered columns

-- content_blocks: every CMS query filters by page_name + section_name
CREATE INDEX IF NOT EXISTS idx_content_blocks_page_section
  ON public.content_blocks(page_name, section_name);

-- blog_posts: public listing always filters by status = 'published'
CREATE INDEX IF NOT EXISTS idx_blog_posts_status
  ON public.blog_posts(status);

-- enrollment_submissions: rate limiting lookups by email
CREATE INDEX IF NOT EXISTS idx_enrollment_submissions_email
  ON public.enrollment_submissions(email);
