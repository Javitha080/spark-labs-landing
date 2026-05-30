-- ============================================================
-- Migration: Upgrade team_members table for Leadership support
-- ============================================================

-- 1. Add new leadership-specific columns
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS is_leadership BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS github_url TEXT,
  ADD COLUMN IF NOT EXISTS twitter_url TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS tenure_start DATE,
  ADD COLUMN IF NOT EXISTS tenure_end DATE;

-- 2. Update team_members_public view to include new columns
DROP VIEW IF EXISTS public.team_members_public;

CREATE VIEW public.team_members_public
WITH (security_invoker = false)
AS
SELECT
  id,
  name,
  role,
  description,
  image_url,
  CASE WHEN show_email = true THEN email ELSE NULL END AS email,
  linkedin_url,
  display_order,
  is_leadership,
  tagline,
  department,
  github_url,
  twitter_url,
  website_url,
  tenure_start,
  tenure_end
FROM public.team_members
ORDER BY display_order ASC;

GRANT SELECT ON public.team_members_public TO anon;
GRANT SELECT ON public.team_members_public TO authenticated;

-- 3. Create a convenience view for leadership-only members
CREATE OR REPLACE VIEW public.leadership_members_public
WITH (security_invoker = false)
AS
SELECT
  id,
  name,
  role,
  description,
  image_url,
  CASE WHEN show_email = true THEN email ELSE NULL END AS email,
  linkedin_url,
  display_order,
  tagline,
  department,
  github_url,
  twitter_url,
  website_url,
  tenure_start,
  tenure_end
FROM public.team_members
WHERE is_leadership = true
ORDER BY display_order ASC;

GRANT SELECT ON public.leadership_members_public TO anon;
GRANT SELECT ON public.leadership_members_public TO authenticated;

-- 4. Create storage bucket for leadership photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'leadership',
  'leadership',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage policies for leadership bucket
-- Public read access
CREATE POLICY "Public can view leadership photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'leadership');

-- Authenticated admin upload
CREATE POLICY "Admins can upload leadership photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'leadership'
    AND auth.role() = 'authenticated'
    AND public.is_admin(auth.uid())
  );

-- Authenticated admin update
CREATE POLICY "Admins can update leadership photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'leadership'
    AND auth.role() = 'authenticated'
    AND public.is_admin(auth.uid())
  );

-- Authenticated admin delete
CREATE POLICY "Admins can delete leadership photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'leadership'
    AND auth.role() = 'authenticated'
    AND public.is_admin(auth.uid())
  );

-- 6. Add index on is_leadership for faster filtering
CREATE INDEX IF NOT EXISTS idx_team_members_is_leadership
  ON public.team_members (is_leadership)
  WHERE is_leadership = true;
