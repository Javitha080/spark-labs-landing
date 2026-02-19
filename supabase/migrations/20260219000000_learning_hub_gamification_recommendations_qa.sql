-- ═══════════════════════════════════════════════════════════════════════════
-- Learning Hub: Gamification, Recommendations, Q&A
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Learning User Stats (XP, streak) — one row per user
CREATE TABLE IF NOT EXISTS public.learning_user_stats (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_xp INTEGER DEFAULT 0,
    current_streak_days INTEGER DEFAULT 0,
    last_activity_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learning_user_stats_xp ON public.learning_user_stats(total_xp DESC);

ALTER TABLE public.learning_user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stats"
    ON public.learning_user_stats FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
    ON public.learning_user_stats FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
    ON public.learning_user_stats FOR UPDATE
    USING (auth.uid() = user_id);

-- 2. Learning Achievements (badges earned)
CREATE TABLE IF NOT EXISTS public.learning_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_type TEXT NOT NULL,
    points_earned INTEGER DEFAULT 0,
    earned_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, achievement_type)
);

CREATE INDEX IF NOT EXISTS idx_learning_achievements_user ON public.learning_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_achievements_type ON public.learning_achievements(achievement_type);

ALTER TABLE public.learning_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
    ON public.learning_achievements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
    ON public.learning_achievements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 3. Learning User Interactions (for recommendations: view, search, enroll)
CREATE TABLE IF NOT EXISTS public.learning_user_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learning_interactions_user ON public.learning_user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_interactions_course ON public.learning_user_interactions(course_id);
CREATE INDEX IF NOT EXISTS idx_learning_interactions_created ON public.learning_user_interactions(created_at DESC);

ALTER TABLE public.learning_user_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interactions"
    ON public.learning_user_interactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions"
    ON public.learning_user_interactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 4. Learning Discussions (Q&A per course)
CREATE TABLE IF NOT EXISTS public.learning_discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.learning_modules(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    is_instructor_answer BOOLEAN DEFAULT false,
    parent_id UUID REFERENCES public.learning_discussions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learning_discussions_course ON public.learning_discussions(course_id);
CREATE INDEX IF NOT EXISTS idx_learning_discussions_user ON public.learning_discussions(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_discussions_parent ON public.learning_discussions(parent_id);
CREATE INDEX IF NOT EXISTS idx_learning_discussions_created ON public.learning_discussions(created_at DESC);

ALTER TABLE public.learning_discussions ENABLE ROW LEVEL SECURITY;

-- Anyone can read discussions for published courses
CREATE POLICY "Anyone can view discussions for published courses"
    ON public.learning_discussions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.learning_courses c
            WHERE c.id = course_id AND c.is_published = true
        )
    );

CREATE POLICY "Authenticated can create discussion"
    ON public.learning_discussions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own discussion"
    ON public.learning_discussions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own discussion"
    ON public.learning_discussions FOR DELETE
    USING (auth.uid() = user_id);

-- Admins/editors can pin and mark instructor answer (handled in app or add role check)
CREATE POLICY "Admins can update any discussion"
    ON public.learning_discussions FOR UPDATE
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.user_roles
            WHERE role IN ('admin', 'editor', 'coordinator')
        )
    );

-- Updated_at trigger for learning_user_stats and learning_discussions
CREATE TRIGGER set_learning_user_stats_updated_at
    BEFORE UPDATE ON public.learning_user_stats
    FOR EACH ROW EXECUTE FUNCTION update_learning_updated_at();

CREATE TRIGGER set_learning_discussions_updated_at
    BEFORE UPDATE ON public.learning_discussions
    FOR EACH ROW EXECUTE FUNCTION update_learning_updated_at();
