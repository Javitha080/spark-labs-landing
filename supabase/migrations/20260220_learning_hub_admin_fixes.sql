-- ======================================================================
-- Migration: Learning Hub Admin Fixes
-- Date: 2026-02-20
-- Description: 
--   1. Admin RLS policies for learning_reviews (moderation)
--   2. Admin SELECT on learning_progress (student tracking)
--   3. Admin UPDATE on learning_enrollments (manual progress)
-- ======================================================================

-- ─── 1. learning_reviews: Admin moderation ───

-- Allow admins/editors to UPDATE reviews (e.g., hide inappropriate content)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'learning_reviews' AND policyname = 'Admins can update reviews'
    ) THEN
        CREATE POLICY "Admins can update reviews"
            ON public.learning_reviews FOR UPDATE
            TO authenticated
            USING (
                auth.uid() IN (
                    SELECT user_id FROM public.user_roles
                    WHERE role IN ('admin', 'editor')
                )
            );
    END IF;
END $$;

-- Allow admins/editors to DELETE reviews
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'learning_reviews' AND policyname = 'Admins can delete reviews'
    ) THEN
        CREATE POLICY "Admins can delete reviews"
            ON public.learning_reviews FOR DELETE
            TO authenticated
            USING (
                auth.uid() IN (
                    SELECT user_id FROM public.user_roles
                    WHERE role IN ('admin', 'editor')
                )
            );
    END IF;
END $$;

-- ─── 2. learning_progress: Admin view all progress ───

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'learning_progress' AND policyname = 'Admins can view all progress'
    ) THEN
        CREATE POLICY "Admins can view all progress"
            ON public.learning_progress FOR SELECT
            TO authenticated
            USING (
                auth.uid() IN (
                    SELECT user_id FROM public.user_roles
                    WHERE role IN ('admin', 'editor', 'coordinator')
                )
            );
    END IF;
END $$;

-- ─── 3. learning_enrollments: Admin update (manual progress adjustment) ───

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'learning_enrollments' AND policyname = 'Admins can update enrollments'
    ) THEN
        CREATE POLICY "Admins can update enrollments"
            ON public.learning_enrollments FOR UPDATE
            TO authenticated
            USING (
                auth.uid() IN (
                    SELECT user_id FROM public.user_roles
                    WHERE role IN ('admin', 'editor', 'coordinator')
                )
            );
    END IF;
END $$;
