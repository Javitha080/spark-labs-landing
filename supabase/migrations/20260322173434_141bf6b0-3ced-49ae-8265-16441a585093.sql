-- 1. Fix learning_user_interactions: allow learner token inserts (public role)
CREATE POLICY "public_learner_interactions_insert"
ON public.learning_user_interactions FOR INSERT
TO public
WITH CHECK (learner_token_id IS NOT NULL);

CREATE POLICY "public_learner_interactions_select"
ON public.learning_user_interactions FOR SELECT
TO public
USING (learner_token_id IS NOT NULL);

-- 2. Fix learning_achievements: allow public role inserts with learner_token_id
CREATE POLICY "public_learner_achievements_insert"
ON public.learning_achievements FOR INSERT
TO public
WITH CHECK (learner_token_id IS NOT NULL);

-- 3. Fix learning_user_stats: add unique constraint on learner_token_id for upsert
CREATE UNIQUE INDEX IF NOT EXISTS learning_user_stats_learner_token_id_unique
ON public.learning_user_stats (learner_token_id)
WHERE learner_token_id IS NOT NULL;