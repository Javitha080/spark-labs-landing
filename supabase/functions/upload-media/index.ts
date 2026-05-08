import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Tiered size limits (bytes) by category for clearer errors
const SIZE_LIMITS: Record<string, number> = {
  image: 25 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  video: 500 * 1024 * 1024,
  pdf: 50 * 1024 * 1024,
};
const HARD_MAX = 500 * 1024 * 1024;

// Map common file extensions to MIME types so iOS / drag-drop / .mkv files
// (which often arrive with empty file.type or application/octet-stream) still pass.
const EXT_TO_MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif',
  heic: 'image/heic', heif: 'image/heif',
  mp4: 'video/mp4', m4v: 'video/x-m4v', mov: 'video/quicktime',
  webm: 'video/webm', mkv: 'video/x-matroska', avi: 'video/x-msvideo',
  '3gp': 'video/3gpp', ogv: 'video/ogg',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg',
  pdf: 'application/pdf',
};

const ALLOWED_MIME_TYPES = new Set<string>([
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
  'image/svg+xml', 'image/avif', 'image/heic', 'image/heif',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v',
  'video/x-matroska', 'video/x-msvideo', 'video/3gpp', 'video/ogg',
  'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg',
  'application/pdf',
]);

function resolveMime(file: File): { mime: string; ext: string; category: string } {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  let mime = (file.type || '').toLowerCase();
  if (!mime || mime === 'application/octet-stream') {
    mime = EXT_TO_MIME[ext] || mime;
  }
  const category = mime.startsWith('image/') ? 'image'
    : mime.startsWith('video/') ? 'video'
    : mime.startsWith('audio/') ? 'audio'
    : mime === 'application/pdf' ? 'pdf'
    : 'other';
  return { mime, ext, category };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Create a client to verify the user
    const supabaseAuthClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Use service role for admin operations (bypassing RLS for media_assets and storage)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Role authorization: only content admins/creators may upload
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    const ALLOWED_ROLES = ['admin', 'editor', 'coordinator', 'content_creator'];
    
    let hasRole = Array.isArray(roleData) && roleData.some((r: { role: string }) => ALLOWED_ROLES.includes(r.role));

    if (!hasRole) {
      // Fallback: Check extended users_management table
      const { data: mgmtData } = await supabaseAdmin
        .from('users_management')
        .select('role_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (mgmtData?.role_id) {
        const { data: extRoleData } = await supabaseAdmin
          .from('roles')
          .select('name')
          .eq('id', mgmtData.role_id)
          .maybeSingle();

        if (extRoleData?.name && ALLOWED_ROLES.includes(extRoleData.name)) {
          hasRole = true;
        }
      }
    }

    if (!hasRole) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Parse FormData
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const rawBucket = (formData.get('bucketName') as string | null) ?? 'gallery'
    const rawFolder = (formData.get('folderPath') as string | null) ?? 'uploads'

    // Whitelist allowed buckets and sanitize folder path to prevent storage RLS bypass
    const ALLOWED_BUCKETS = ['gallery', 'projects', 'teachers', 'blog', 'course-content', 'avatars'];
    if (!ALLOWED_BUCKETS.includes(rawBucket)) {
      return new Response(JSON.stringify({ error: 'Invalid bucket' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const bucketName = rawBucket;
    const folderPath = rawFolder.replace(/\.\./g, '').replace(/[^a-zA-Z0-9_\-/]/g, '').replace(/^\/+|\/+$/g, '') || 'uploads';

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. Validate file type and size with extension fallback
    const { mime, ext, category } = resolveMime(file);
    console.log(`[upload-media] user=${user.id} bucket=${bucketName} name=${file.name} ext=${ext} type=${file.type} resolvedMime=${mime} size=${file.size}`);

    if (!ALLOWED_MIME_TYPES.has(mime)) {
      return new Response(JSON.stringify({
        error: `Unsupported media type${ext ? ` ".${ext}"` : ''}${mime ? ` (${mime})` : ''}. Allowed: images (png/jpg/gif/webp/svg/avif/heic), videos (mp4/webm/mov/m4v/mkv/avi/3gp), audio (mp3/m4a/wav/ogg), and pdf.`
      }), { status: 415, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const limit = SIZE_LIMITS[category] ?? HARD_MAX;
    if (file.size > limit) {
      const sizeMb = (file.size / 1024 / 1024).toFixed(1);
      const limitMb = Math.round(limit / 1024 / 1024);
      return new Response(JSON.stringify({
        error: `File too large: ${sizeMb} MB. Limit for ${category} files is ${limitMb} MB.`
      }), { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 4. Calculate SHA-256 hash
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // 5. Check deduplication
    const { data: existingAsset, error: checkError } = await supabaseAdmin
      .from('media_assets')
      .select('*')
      .eq('file_hash', fileHash)
      .eq('bucket_name', bucketName)
      .maybeSingle();

    if (checkError) {
      console.error("Duplicate check failed:", checkError);
    }

    if (existingAsset) {
      console.log(`[Duplicate Success] Skipping upload, reusing asset: ${existingAsset.public_url}`);
      return new Response(JSON.stringify({
        message: 'File detected and reused',
        url: existingAsset.public_url,
        path: existingAsset.file_path,
        reused: true
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 6. Upload to Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${folderPath}/${fileName}`;

    // Use resolved MIME (handles iOS / octet-stream uploads correctly)
    const blob = new Blob([arrayBuffer], { type: mime });

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(filePath, blob, {
        contentType: mime,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      const msg = (uploadError as { message?: string })?.message || 'Upload failed';
      return new Response(JSON.stringify({ error: `Storage upload failed: ${msg}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 7. Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    // 8. Record in media_assets
    const { error: insertError } = await supabaseAdmin
      .from('media_assets')
      .insert([{
        file_hash: fileHash,
        bucket_name: bucketName,
        file_path: filePath,
        public_url: publicUrl,
        file_size: file.size,
        mime_type: file.type
      }]);

    if (insertError) {
      console.error("Failed to record media asset:", insertError);
      // Still return success since the file was uploaded
    }

    return new Response(JSON.stringify({
      message: 'File uploaded successfully',
      url: publicUrl,
      path: filePath,
      reused: false
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
