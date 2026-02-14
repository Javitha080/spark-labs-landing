-- ═══════════════════════════════════════════════════
-- UDEMY-STYLE LEARNING HUB UPGRADES
-- ═══════════════════════════════════════════════════

-- 1. Add new columns to learning_courses
ALTER TABLE public.learning_courses
ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS enrolled_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS instructor_bio TEXT,
ADD COLUMN IF NOT EXISTS instructor_avatar TEXT,
ADD COLUMN IF NOT EXISTS learning_outcomes TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS prerequisites TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English',
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT NOW();

-- 2. Create learning_reviews table
CREATE TABLE IF NOT EXISTS public.learning_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.learning_courses(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, course_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_course ON public.learning_reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON public.learning_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.learning_reviews(rating);

-- RLS for reviews
ALTER TABLE public.learning_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved reviews
CREATE POLICY "Anyone can view approved reviews"
    ON public.learning_reviews FOR SELECT
    USING (is_approved = true);

-- Authenticated users can insert their own review
CREATE POLICY "Users can create own review"
    ON public.learning_reviews FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own review
CREATE POLICY "Users can update own review"
    ON public.learning_reviews FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own review
CREATE POLICY "Users can delete own review"
    ON public.learning_reviews FOR DELETE
    USING (auth.uid() = user_id);

-- 3. Function to auto-update course rating_avg and rating_count
CREATE OR REPLACE FUNCTION update_course_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.learning_courses
    SET rating_avg = (
        SELECT COALESCE(AVG(rating), 0)
        FROM public.learning_reviews
        WHERE course_id = COALESCE(NEW.course_id, OLD.course_id)
        AND is_approved = true
    ),
    rating_count = (
        SELECT COUNT(*)
        FROM public.learning_reviews
        WHERE course_id = COALESCE(NEW.course_id, OLD.course_id)
        AND is_approved = true
    )
    WHERE id = COALESCE(NEW.course_id, OLD.course_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_course_rating
AFTER INSERT OR UPDATE OR DELETE ON public.learning_reviews
FOR EACH ROW EXECUTE FUNCTION update_course_rating();

-- 4. Function to auto-update enrolled_count
CREATE OR REPLACE FUNCTION update_enrolled_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.learning_courses
    SET enrolled_count = (
        SELECT COUNT(*)
        FROM public.learning_enrollments
        WHERE course_id = COALESCE(NEW.course_id, OLD.course_id)
    )
    WHERE id = COALESCE(NEW.course_id, OLD.course_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_enrolled_count
AFTER INSERT OR DELETE ON public.learning_enrollments
FOR EACH ROW EXECUTE FUNCTION update_enrolled_count();
