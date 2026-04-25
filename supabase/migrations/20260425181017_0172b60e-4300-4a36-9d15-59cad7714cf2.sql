
-- Public buckets serve files via public URLs without needing SELECT policies.
-- Drop the broad SELECT policies that enable bucket-wide listing.
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public can view course content" ON storage.objects;
