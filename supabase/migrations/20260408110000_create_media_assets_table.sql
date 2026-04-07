-- Migration to create media_assets table for duplicate upload prevention
CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_hash TEXT NOT NULL,
    bucket_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(file_hash, bucket_name)
);

-- Enable RLS
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public Read Access" ON public.media_assets
    FOR SELECT USING (true);

-- Allow authenticated users to insert (assuming they can upload to storage)
CREATE POLICY "Authenticated Insert" ON public.media_assets
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create index on file_hash for fast lookups
CREATE INDEX IF NOT EXISTS idx_media_assets_hash ON public.media_assets(file_hash);

-- Grant permissions (if needed)
GRANT ALL ON TABLE public.media_assets TO postgres, authenticated, service_role;
GRANT SELECT ON TABLE public.media_assets TO anon;
