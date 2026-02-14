-- ============================================================
-- Learning Hub v2: Sections & Hierarchical Content
-- ============================================================

-- 1. Create Sections Table
CREATE TABLE IF NOT EXISTS public.learning_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    display_order INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add section_id to Modules
ALTER TABLE public.learning_modules 
ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.learning_sections(id) ON DELETE CASCADE;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_learning_sections_course ON public.learning_sections(course_id);
CREATE INDEX IF NOT EXISTS idx_learning_modules_section ON public.learning_modules(section_id);

-- 4. Triggers for updated_at
CREATE TRIGGER set_learning_sections_updated_at
    BEFORE UPDATE ON public.learning_sections
    FOR EACH ROW EXECUTE FUNCTION update_learning_updated_at();

-- 5. RLS Policies for Sections
ALTER TABLE public.learning_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published sections"
    ON public.learning_sections FOR SELECT
    USING (is_published = true);

CREATE POLICY "Admins can view all sections"
    ON public.learning_sections FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can insert sections"
    ON public.learning_sections FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Admins can update sections"
    ON public.learning_sections FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Admins can delete sections"
    ON public.learning_sections FOR DELETE
    TO authenticated
    USING (true);
