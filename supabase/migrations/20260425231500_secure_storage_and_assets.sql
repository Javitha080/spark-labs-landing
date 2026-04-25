-- Secure media_assets table
-- Drop the insecure policy that allowed any authenticated user to insert fake hashes
DROP POLICY IF EXISTS "Authenticated Insert" ON public.media_assets;

-- Allow only admins to manually manipulate media_assets if needed
-- (The Edge Function uses service_role which bypasses RLS anyway)
CREATE POLICY "Admin Insert" ON public.media_assets
    FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admin Update" ON public.media_assets
    FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin Delete" ON public.media_assets
    FOR DELETE USING (public.is_admin(auth.uid()));

-- Secure Storage Buckets
-- Drop the policies that allowed direct client uploads without size/type validation
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload course content" ON storage.objects;

-- Note: We do NOT recreate these policies for 'authenticated' users.
-- All uploads must now go through the secure Edge Function ('upload-media'),
-- which uses the service_role key to bypass RLS after strict validation.
