import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm',
  'application/pdf'
];

serve(async (req) => {
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

    // 2. Parse FormData
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const bucketName = formData.get('bucketName') as string | null ?? 'gallery'
    const folderPath = formData.get('folderPath') as string | null ?? 'uploads'

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. Validate file size and type
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: 'File exceeds 10MB limit' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return new Response(JSON.stringify({ error: `Invalid file type: ${file.type}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
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

    // Convert ArrayBuffer back to blob for upload
    const blob = new Blob([arrayBuffer], { type: file.type });
    
    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(filePath, blob, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload to storage', details: uploadError }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
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
