
-- Create course-content storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-content', 'course-content', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload course content"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-content');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update course content"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'course-content');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete course content"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'course-content');

-- Allow public read access
CREATE POLICY "Public can view course content"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'course-content');
