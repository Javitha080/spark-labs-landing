-- Add collection support to gallery_items
ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS collection_name TEXT DEFAULT NULL;
ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS collection_cover BOOLEAN DEFAULT FALSE;

-- Index for fast collection grouping
CREATE INDEX IF NOT EXISTS idx_gallery_items_collection ON gallery_items(collection_name) WHERE collection_name IS NOT NULL;
