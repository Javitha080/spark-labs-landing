-- Add learner_token_id support to gamification and interaction tables
-- This allows token-based learners (non-auth users) to earn XP, achievements, and get recommendations

-- 1. learning_user_stats: drop primary key on user_id if it exists, add learner_token_id, make user_id nullable
DO $$
BEGIN
    ALTER TABLE IF EXISTS learning_user_stats DROP CONSTRAINT IF EXISTS learning_user_stats_pkey;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

ALTER TABLE learning_user_stats
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS learner_token_id UUID REFERENCES learner_tokens(id) ON DELETE CASCADE;

-- Add unique constraint on learner_token_id (only one stats row per learner)
CREATE UNIQUE INDEX IF NOT EXISTS learning_user_stats_learner_token_id_key
  ON learning_user_stats(learner_token_id) WHERE learner_token_id IS NOT NULL;

-- 2. learning_achievements: add learner_token_id, make user_id nullable
ALTER TABLE learning_achievements
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS learner_token_id UUID REFERENCES learner_tokens(id) ON DELETE CASCADE;

-- Add unique constraint for learner_token_id + achievement_type
CREATE UNIQUE INDEX IF NOT EXISTS learning_achievements_learner_token_unique
  ON learning_achievements(learner_token_id, achievement_type) WHERE learner_token_id IS NOT NULL;

-- 3. learning_user_interactions: add learner_token_id, make user_id nullable
ALTER TABLE learning_user_interactions
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS learner_token_id UUID REFERENCES learner_tokens(id) ON DELETE CASCADE;

-- Add index for efficient recommendation queries by learner_token_id
CREATE INDEX IF NOT EXISTS idx_learning_user_interactions_learner_token
  ON learning_user_interactions(learner_token_id) WHERE learner_token_id IS NOT NULL;

-- 4. RLS policies for anonymous access via learner_token_id
-- learning_user_stats
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'learning_user_stats' AND policyname = 'learner_stats_anon_insert'
    ) THEN
        CREATE POLICY "learner_stats_anon_insert" ON learning_user_stats FOR INSERT TO anon WITH CHECK (learner_token_id IS NOT NULL);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'learning_user_stats' AND policyname = 'learner_stats_anon_select'
    ) THEN
        CREATE POLICY "learner_stats_anon_select" ON learning_user_stats FOR SELECT TO anon USING (learner_token_id IS NOT NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'learning_user_stats' AND policyname = 'learner_stats_anon_update'
    ) THEN
        CREATE POLICY "learner_stats_anon_update" ON learning_user_stats FOR UPDATE TO anon USING (learner_token_id IS NOT NULL) WITH CHECK (learner_token_id IS NOT NULL);
    END IF;
END
$$;

-- learning_achievements
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'learning_achievements' AND policyname = 'learner_achievements_anon_insert'
    ) THEN
        CREATE POLICY "learner_achievements_anon_insert" ON learning_achievements FOR INSERT TO anon WITH CHECK (learner_token_id IS NOT NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'learning_achievements' AND policyname = 'learner_achievements_anon_select'
    ) THEN
        CREATE POLICY "learner_achievements_anon_select" ON learning_achievements FOR SELECT TO anon USING (learner_token_id IS NOT NULL);
    END IF;
END
$$;

-- learning_user_interactions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'learning_user_interactions' AND policyname = 'learner_interactions_anon_insert'
    ) THEN
        CREATE POLICY "learner_interactions_anon_insert" ON learning_user_interactions FOR INSERT TO anon WITH CHECK (learner_token_id IS NOT NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'learning_user_interactions' AND policyname = 'learner_interactions_anon_select'
    ) THEN
        CREATE POLICY "learner_interactions_anon_select" ON learning_user_interactions FOR SELECT TO anon USING (learner_token_id IS NOT NULL);
    END IF;
END
$$;
