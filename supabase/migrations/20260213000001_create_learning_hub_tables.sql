-- ============================================================
-- Learning Hub Tables
-- ============================================================

-- 1. Learning Courses
CREATE TABLE IF NOT EXISTS public.learning_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT '',
    level TEXT DEFAULT 'beginner',
    content_type TEXT DEFAULT 'video',
    content_url TEXT DEFAULT '',
    thumbnail_url TEXT DEFAULT '',
    instructor TEXT DEFAULT '',
    duration TEXT DEFAULT '',
    skills TEXT[] DEFAULT '{}',
    is_featured BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Learning Modules (lessons within courses)
CREATE TABLE IF NOT EXISTS public.learning_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    content_type TEXT DEFAULT 'video',
    content_url TEXT DEFAULT '',
    duration_minutes INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Learning Workshops
CREATE TABLE IF NOT EXISTS public.learning_workshops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    workshop_date DATE,
    workshop_time TEXT DEFAULT '',
    location TEXT DEFAULT '',
    max_capacity INTEGER DEFAULT 0,
    materials TEXT DEFAULT '',
    instructor TEXT DEFAULT '',
    category TEXT DEFAULT '',
    is_featured BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    registration_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Learning Resources
CREATE TABLE IF NOT EXISTS public.learning_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    resource_type TEXT DEFAULT 'tool',
    url TEXT DEFAULT '',
    icon TEXT DEFAULT 'link',
    display_order INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_learning_courses_slug ON public.learning_courses(slug);
CREATE INDEX IF NOT EXISTS idx_learning_courses_category ON public.learning_courses(category);
CREATE INDEX IF NOT EXISTS idx_learning_courses_published ON public.learning_courses(is_published);
CREATE INDEX IF NOT EXISTS idx_learning_modules_course ON public.learning_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_learning_workshops_date ON public.learning_workshops(workshop_date);
CREATE INDEX IF NOT EXISTS idx_learning_workshops_published ON public.learning_workshops(is_published);
CREATE INDEX IF NOT EXISTS idx_learning_resources_published ON public.learning_resources(is_published);

-- ============================================================
-- Updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_learning_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_learning_courses_updated_at
    BEFORE UPDATE ON public.learning_courses
    FOR EACH ROW EXECUTE FUNCTION update_learning_updated_at();

CREATE TRIGGER set_learning_modules_updated_at
    BEFORE UPDATE ON public.learning_modules
    FOR EACH ROW EXECUTE FUNCTION update_learning_updated_at();

CREATE TRIGGER set_learning_workshops_updated_at
    BEFORE UPDATE ON public.learning_workshops
    FOR EACH ROW EXECUTE FUNCTION update_learning_updated_at();

CREATE TRIGGER set_learning_resources_updated_at
    BEFORE UPDATE ON public.learning_resources
    FOR EACH ROW EXECUTE FUNCTION update_learning_updated_at();

-- ============================================================
-- RLS Policies — Public read, admin write
-- ============================================================

-- Courses
ALTER TABLE public.learning_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published courses"
    ON public.learning_courses FOR SELECT
    USING (is_published = true);

CREATE POLICY "Admins can view all courses"
    ON public.learning_courses FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can insert courses"
    ON public.learning_courses FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Admins can update courses"
    ON public.learning_courses FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Admins can delete courses"
    ON public.learning_courses FOR DELETE
    TO authenticated
    USING (true);

-- Modules
ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published modules"
    ON public.learning_modules FOR SELECT
    USING (is_published = true);

CREATE POLICY "Admins can view all modules"
    ON public.learning_modules FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can insert modules"
    ON public.learning_modules FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Admins can update modules"
    ON public.learning_modules FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Admins can delete modules"
    ON public.learning_modules FOR DELETE
    TO authenticated
    USING (true);

-- Workshops
ALTER TABLE public.learning_workshops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published workshops"
    ON public.learning_workshops FOR SELECT
    USING (is_published = true);

CREATE POLICY "Admins can view all workshops"
    ON public.learning_workshops FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can insert workshops"
    ON public.learning_workshops FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Admins can update workshops"
    ON public.learning_workshops FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Admins can delete workshops"
    ON public.learning_workshops FOR DELETE
    TO authenticated
    USING (true);

-- Resources
ALTER TABLE public.learning_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published resources"
    ON public.learning_resources FOR SELECT
    USING (is_published = true);

CREATE POLICY "Admins can view all resources"
    ON public.learning_resources FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can insert resources"
    ON public.learning_resources FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Admins can update resources"
    ON public.learning_resources FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Admins can delete resources"
    ON public.learning_resources FOR DELETE
    TO authenticated
    USING (true);
