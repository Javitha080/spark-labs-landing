-- Migration: Add video settings to gallery_items and create storage bucket

-- Add columns for video settings
ALTER TABLE public.gallery_items 
  ADD COLUMN IF NOT EXISTS video_is_muted boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS video_autoplay boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS video_loop boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS video_controls boolean DEFAULT true;

-- Ensure the 'gallery' storage bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('gallery', 'gallery', true) 
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the 'gallery' bucket
-- Allow public access to read
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'gallery');

-- Allow authenticated users to upload/manage
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'gallery' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update" ON storage.objects FOR UPDATE USING (bucket_id = 'gallery' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete" ON storage.objects FOR DELETE USING (bucket_id = 'gallery' AND auth.role() = 'authenticated');
