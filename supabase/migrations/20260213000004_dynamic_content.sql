-- Create content_blocks table for dynamic CMS content
CREATE TABLE IF NOT EXISTS public.content_blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    page_name TEXT NOT NULL,
    section_name TEXT NOT NULL,
    block_key TEXT NOT NULL,
    content_value TEXT,
    image_url TEXT,
    usage_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(page_name, section_name, block_key)
);

-- Enable RLS
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view content_blocks" ON public.content_blocks
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage content_blocks" ON public.content_blocks
    FOR ALL USING (auth.role() = 'authenticated');

-- Seed initial data for Learning Hub Landing Page
INSERT INTO public.content_blocks (page_name, section_name, block_key, content_value, usage_description)
VALUES
    ('learning_hub', 'hero', 'badge', 'Free Learning Platform', 'Badge text above main title'),
    ('learning_hub', 'hero', 'title_prefix', 'Learn Without', 'First part of main title'),
    ('learning_hub', 'hero', 'title_highlight', 'Limits', 'Highlighted part of main title'),
    ('learning_hub', 'hero', 'description', '{count}+ courses in Robotics, Coding, Electronics & more — completely free for SPARK Labs members.', 'Hero description. {count} will be replaced by actual course count.'),
    ('learning_hub', 'cta', 'title', 'Start Your Learning Journey', 'Bottom CTA section title'),
    ('learning_hub', 'cta', 'description', 'Join our society and access all courses, workshops, and resources for free.', 'Bottom CTA section description'),
    ('learning_hub', 'cta', 'button_primary', 'Get Started', 'Primary button text'),
    ('learning_hub', 'cta', 'button_secondary', 'Contact Us', 'Secondary button text')
ON CONFLICT (page_name, section_name, block_key) DO NOTHING;
