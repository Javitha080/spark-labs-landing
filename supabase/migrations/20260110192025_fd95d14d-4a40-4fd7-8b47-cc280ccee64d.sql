-- Create blog post status enum
CREATE TYPE public.blog_post_status AS ENUM ('draft', 'in_review', 'published');

-- Add new columns to blog_posts table
ALTER TABLE public.blog_posts 
  ADD COLUMN IF NOT EXISTS status public.blog_post_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS tech_stack text[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reading_time_minutes integer DEFAULT NULL;

-- Migrate existing is_published data to status
UPDATE public.blog_posts 
SET status = CASE 
  WHEN is_published = true THEN 'published'::public.blog_post_status 
  ELSE 'draft'::public.blog_post_status 
END;

-- Update author_id from created_by where available
UPDATE public.blog_posts 
SET author_id = created_by 
WHERE created_by IS NOT NULL AND author_id IS NULL;

-- Create function to calculate reading time (assuming 200 words per minute)
CREATE OR REPLACE FUNCTION public.calculate_reading_time()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate words by splitting content on whitespace and counting
  NEW.reading_time_minutes = GREATEST(1, CEIL(
    array_length(regexp_split_to_array(regexp_replace(NEW.content, '<[^>]*>', '', 'g'), E'\\s+'), 1)::numeric / 200
  ));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-calculate reading time
DROP TRIGGER IF EXISTS calculate_blog_reading_time ON public.blog_posts;
CREATE TRIGGER calculate_blog_reading_time
  BEFORE INSERT OR UPDATE OF content ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_reading_time();

-- Add Content Creator role if not exists
INSERT INTO public.roles (name, description, is_system_role)
VALUES ('content_creator', 'Can create and manage blog content', false)
ON CONFLICT (name) DO NOTHING;

-- Drop old RLS policies
DROP POLICY IF EXISTS "Anyone can view published blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can view all blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can insert blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can update blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can delete blog posts" ON public.blog_posts;

-- Create function to check if user has content creator role
CREATE OR REPLACE FUNCTION public.is_content_creator(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users_management um
    JOIN public.roles r ON um.role_id = r.id
    WHERE um.user_id = _user_id
      AND r.name IN ('content_creator', 'admin')
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- New RLS policies for blog_posts

-- Public can view published posts
CREATE POLICY "Anyone can view published posts"
ON public.blog_posts
FOR SELECT
USING (status = 'published');

-- Admins and content creators can view all posts
CREATE POLICY "Content managers can view all posts"
ON public.blog_posts
FOR SELECT
USING (is_content_creator(auth.uid()));

-- Authors can view their own posts
CREATE POLICY "Authors can view own posts"
ON public.blog_posts
FOR SELECT
USING (author_id = auth.uid());

-- Admins and content creators can insert posts
CREATE POLICY "Content managers can insert posts"
ON public.blog_posts
FOR INSERT
WITH CHECK (is_content_creator(auth.uid()) OR is_admin(auth.uid()));

-- Authors can update their own posts (but not change status to published unless admin)
CREATE POLICY "Authors can update own posts"
ON public.blog_posts
FOR UPDATE
USING (author_id = auth.uid());

-- Admins can update any post
CREATE POLICY "Admins can update all posts"
ON public.blog_posts
FOR UPDATE
USING (is_admin(auth.uid()));

-- Admins can delete any post
CREATE POLICY "Admins can delete posts"
ON public.blog_posts
FOR DELETE
USING (is_admin(auth.uid()));

-- Authors can delete their own draft posts
CREATE POLICY "Authors can delete own drafts"
ON public.blog_posts
FOR DELETE
USING (author_id = auth.uid() AND status = 'draft');

-- Add unique constraint on role name if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'roles_name_key'
  ) THEN
    ALTER TABLE public.roles ADD CONSTRAINT roles_name_key UNIQUE (name);
  END IF;
END $$;