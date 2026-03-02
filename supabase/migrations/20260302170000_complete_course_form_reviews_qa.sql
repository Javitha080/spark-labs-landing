-- ═══════════════════════════════════════════
-- Complete Course Form: Add missing columns
-- ═══════════════════════════════════════════

ALTER TABLE public.learning_courses
  ADD COLUMN IF NOT EXISTS long_description TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS tinkercad_classroom_url TEXT,
  ADD COLUMN IF NOT EXISTS tinkercad_project_url TEXT,
  ADD COLUMN IF NOT EXISTS welcome_message TEXT,
  ADD COLUMN IF NOT EXISTS certificate_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS promo_video_url TEXT,
  ADD COLUMN IF NOT EXISTS target_audience TEXT;

-- ═══════════════════════════════════════════
-- Reviews: Add admin reply columns
-- ═══════════════════════════════════════════

ALTER TABLE public.learning_reviews
  ADD COLUMN IF NOT EXISTS admin_reply TEXT,
  ADD COLUMN IF NOT EXISTS admin_reply_at TIMESTAMPTZ;
