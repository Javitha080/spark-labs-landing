import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase URL or Key in environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generatePlaceholder(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
        console.error(`Failed to fetch image: ${imageUrl}, status: ${response.status}`);
        return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const placeholderData = await sharp(buffer)
      .resize(20, 20, { fit: 'inside' })
      .webp({ quality: 20 })
      .toBuffer();
      
    return "data:image/webp;base64," + placeholderData.toString("base64");
  } catch (err) {
    console.error(`Error processing image ${imageUrl}:`, err);
    return null;
  }
}

async function backfillGallery() {
  console.log("🚀 Starting Gallery Backfill...");
  const { data: items, error } = await supabase
    .from('gallery_items')
    .select('id, url, base64_placeholder');

  if (error) {
    console.error("❌ Error fetching gallery items:", error);
    return;
  }

  let updated = 0;
  for (const item of items || []) {
    if (!item.base64_placeholder && item.url) {
      console.log(`Processing gallery item: ${item.id}`);
      const base64 = await generatePlaceholder(item.url);
      if (base64) {
        const { error: updateError } = await supabase
          .from('gallery_items')
          .update({ base64_placeholder: base64 })
          .eq('id', item.id);
          
        if (updateError) {
           console.error(`❌ Failed to update gallery item ${item.id}:`, updateError);
        } else {
           console.log(`✅ Updated gallery item: ${item.id}`);
           updated++;
        }
      }
    }
  }
  console.log(`🎉 Finished Gallery Backfill. Updated ${updated} items.`);
}

async function backfillBlogPosts() {
  console.log("🚀 Starting Blog Posts Backfill...");
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('id, cover_image, cover_base64_placeholder, author_image, author_base64_placeholder');

  if (error) {
    console.error("❌ Error fetching blog posts:", error);
    return;
  }

  let updated = 0;
  for (const post of posts || []) {
    let updateData: any = {};
    let needsUpdate = false;

    if (post.cover_image && !post.cover_base64_placeholder) {
      console.log(`Processing blog cover: ${post.id}`);
      const base64 = await generatePlaceholder(post.cover_image);
      if (base64) {
        updateData.cover_base64_placeholder = base64;
        needsUpdate = true;
      }
    }

    if (post.author_image && !post.author_base64_placeholder) {
      console.log(`Processing blog author: ${post.id}`);
      const base64 = await generatePlaceholder(post.author_image);
      if (base64) {
        updateData.author_base64_placeholder = base64;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update(updateData)
          .eq('id', post.id);
          
        if (updateError) {
           console.error(`❌ Failed to update blog post ${post.id}:`, updateError);
        } else {
           console.log(`✅ Updated blog post: ${post.id}`);
           updated++;
        }
    }
  }
  console.log(`🎉 Finished Blog Posts Backfill. Updated ${updated} items.`);
}

async function run() {
  await backfillGallery();
  await backfillBlogPosts();
  process.exit(0);
}

run();
