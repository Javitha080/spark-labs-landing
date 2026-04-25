-- Secure media_assets table
DROP POLICY IF EXISTS "Authenticated Insert" ON public.media_assets;

CREATE POLICY "Admin Insert" ON public.media_assets
    FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admin Update" ON public.media_assets
    FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin Delete" ON public.media_assets
    FOR DELETE USING (public.is_admin(auth.uid()));

-- Secure Storage Buckets - drop insecure direct upload policies
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload course content" ON storage.objects;