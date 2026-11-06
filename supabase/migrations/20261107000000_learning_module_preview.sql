-- learning_modules.is_preview — Udemy-style free preview lessons.
--
-- Presentation-level gate, not a secrets boundary: the public read policy on
-- learning_modules ("Public can view published modules") already exposes
-- published rows to everyone, including content_url. is_preview therefore
-- controls what the public course page offers (Preview badge + preview
-- player), matching that existing policy rather than pretending to hide data
-- the row policy makes readable.
--
-- Re-runnable: IF NOT EXISTS.
ALTER TABLE public.learning_modules
    ADD COLUMN IF NOT EXISTS is_preview BOOLEAN NOT NULL DEFAULT false;
