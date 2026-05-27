-- Migration to support Client-Side Image Pipeline with instant base64 placeholders

-- Add base64_placeholder to gallery_items for instant LCP loading
ALTER TABLE gallery_items 
ADD COLUMN IF NOT EXISTS base64_placeholder text;

-- Add base64_placeholder to blog_posts for cover and author images
ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS cover_base64_placeholder text,
ADD COLUMN IF NOT EXISTS author_base64_placeholder text;

-- Add base64_placeholder to profiles for avatars
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_base64_placeholder text;

-- Optional: Update Supabase GraphQL schema cache
notify pgrst, 'reload schema';
