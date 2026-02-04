-- Add video support to gallery_items
ALTER TABLE public.gallery_items 
  ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Add check constraint for media_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gallery_items_media_type_check'
  ) THEN
    ALTER TABLE public.gallery_items 
      ADD CONSTRAINT gallery_items_media_type_check CHECK (media_type IN ('image', 'video'));
  END IF;
END $$;

-- Update existing items to image type
UPDATE public.gallery_items SET media_type = 'image' WHERE media_type IS NULL;