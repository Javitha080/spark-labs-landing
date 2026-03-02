-- ═══════════════════════════════════════════
-- Fix Reviews: Support Learner Token Identity
-- ═══════════════════════════════════════════

-- 1. Add learner_token_id and reviewer_name to learning_reviews
ALTER TABLE public.learning_reviews
  ADD COLUMN IF NOT EXISTS learner_token_id UUID REFERENCES public.learner_tokens(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewer_name TEXT;

-- 2. Make user_id nullable (learner-token reviews won't have a Supabase Auth user)
ALTER TABLE public.learning_reviews
  ALTER COLUMN user_id DROP NOT NULL;

-- 3. Drop the existing unique constraint on (user_id, course_id) and recreate
--    We need to allow learner_token_id-based uniqueness too
ALTER TABLE public.learning_reviews DROP CONSTRAINT IF EXISTS learning_reviews_user_id_course_id_key;

-- Create partial unique indexes instead:
-- One for auth-based reviews
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_user
  ON public.learning_reviews(user_id, course_id)
  WHERE user_id IS NOT NULL;

-- One for learner-token-based reviews
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_learner
  ON public.learning_reviews(learner_token_id, course_id)
  WHERE learner_token_id IS NOT NULL;

-- 4. Add CHECK: at least one identity must be present
ALTER TABLE public.learning_reviews
  DROP CONSTRAINT IF EXISTS chk_review_identity;
ALTER TABLE public.learning_reviews
  ADD CONSTRAINT chk_review_identity
  CHECK (user_id IS NOT NULL OR learner_token_id IS NOT NULL);

-- 5. RLS: Allow anyone to INSERT reviews with a learner_token_id
CREATE POLICY "Learners can create review via token"
  ON public.learning_reviews FOR INSERT
  WITH CHECK (learner_token_id IS NOT NULL);

-- 6. RLS: Allow anyone to UPDATE their own learner-token review
CREATE POLICY "Learners can update own token review"
  ON public.learning_reviews FOR UPDATE
  USING (learner_token_id IS NOT NULL);

-- 7. Index for performance
CREATE INDEX IF NOT EXISTS idx_reviews_learner_token
  ON public.learning_reviews(learner_token_id);
