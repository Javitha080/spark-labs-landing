-- Fix permissions for content_blocks table

-- Ensure RLS is enabled
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;

-- Grant permissions to roles
GRANT ALL ON TABLE public.content_blocks TO authenticated;
GRANT ALL ON TABLE public.content_blocks TO service_role;
GRANT SELECT ON TABLE public.content_blocks TO anon;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public can view content_blocks" ON public.content_blocks;
DROP POLICY IF EXISTS "Authenticated users can manage content_blocks" ON public.content_blocks;
DROP POLICY IF EXISTS "Anyone can update content_blocks" ON public.content_blocks;

-- Create permissive policies
CREATE POLICY "Public can view content_blocks" ON public.content_blocks
    FOR SELECT USING (true);

-- Allow authenticated users to do everything
CREATE POLICY "Authenticated users can manage content_blocks" ON public.content_blocks
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM public.user_roles 
            WHERE role IN ('admin', 'editor', 'content_creator')
        )
    );
