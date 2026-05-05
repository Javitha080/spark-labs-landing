-- Create missing public storage buckets used by the CMS upload-media function
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('projects', 'projects', true),
  ('teachers', 'teachers', true),
  ('blog', 'blog', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Public read for the new buckets (so frontend can display media)
DROP POLICY IF EXISTS "Public read projects" ON storage.objects;
CREATE POLICY "Public read projects" ON storage.objects
  FOR SELECT USING (bucket_id = 'projects');

DROP POLICY IF EXISTS "Public read teachers" ON storage.objects;
CREATE POLICY "Public read teachers" ON storage.objects
  FOR SELECT USING (bucket_id = 'teachers');

DROP POLICY IF EXISTS "Public read blog" ON storage.objects;
CREATE POLICY "Public read blog" ON storage.objects
  FOR SELECT USING (bucket_id = 'blog');

-- Content-admin write policies
DROP POLICY IF EXISTS "Content admins can insert projects" ON storage.objects;
CREATE POLICY "Content admins can insert projects" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'projects' AND is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Content admins can update projects" ON storage.objects;
CREATE POLICY "Content admins can update projects" ON storage.objects
  FOR UPDATE USING (bucket_id = 'projects' AND is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Content admins can delete projects" ON storage.objects;
CREATE POLICY "Content admins can delete projects" ON storage.objects
  FOR DELETE USING (bucket_id = 'projects' AND is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Content admins can insert teachers" ON storage.objects;
CREATE POLICY "Content admins can insert teachers" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'teachers' AND is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Content admins can update teachers" ON storage.objects;
CREATE POLICY "Content admins can update teachers" ON storage.objects
  FOR UPDATE USING (bucket_id = 'teachers' AND is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Content admins can delete teachers" ON storage.objects;
CREATE POLICY "Content admins can delete teachers" ON storage.objects
  FOR DELETE USING (bucket_id = 'teachers' AND is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Content admins can insert blog" ON storage.objects;
CREATE POLICY "Content admins can insert blog" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'blog' AND is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Content admins can update blog" ON storage.objects;
CREATE POLICY "Content admins can update blog" ON storage.objects
  FOR UPDATE USING (bucket_id = 'blog' AND is_content_admin(auth.uid()));

DROP POLICY IF EXISTS "Content admins can delete blog" ON storage.objects;
CREATE POLICY "Content admins can delete blog" ON storage.objects
  FOR DELETE USING (bucket_id = 'blog' AND is_content_admin(auth.uid()));