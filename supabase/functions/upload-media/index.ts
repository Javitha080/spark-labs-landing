import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-correlation-id',
  'Access-Control-Expose-Headers': 'x-correlation-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Build a JSON response that includes the correlation ID in body + header
function reply(status: number, body: Record<string, unknown>, correlationId: string) {
  return new Response(JSON.stringify({ ...body, correlationId }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': correlationId },
  });
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Correlation ID — accept from client (X-Correlation-Id) or generate one.
  const correlationId =
    req.headers.get('x-correlation-id') ||
    (globalThis.crypto?.randomUUID?.() ?? `cid_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const t0 = Date.now();
  const logCtx = (extra: Record<string, unknown> = {}) =>
    JSON.stringify({ correlationId, elapsedMs: Date.now() - t0, ...extra });

  try {
    console.log('[upload-media] start', logCtx({ method: req.method }));

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.warn('[upload-media] missing-auth', logCtx());
      return reply(401, { error: 'Missing Authorization header', code: 'AUTH_MISSING' }, correlationId);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabaseAuthClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser();
    if (userError || !user) {
      console.warn('[upload-media] auth-failed', logCtx({ err: userError?.message }));
      return reply(401, { error: 'Unauthorized', code: 'AUTH_INVALID' }, correlationId);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Role check
    const { data: roleData } = await supabaseAdmin
      .from('user_roles').select('role').eq('user_id', user.id);
    const ALLOWED_ROLES = ['admin', 'editor', 'coordinator', 'content_creator'];
    let hasRole = Array.isArray(roleData) && roleData.some((r: { role: string }) => ALLOWED_ROLES.includes(r.role));

    if (!hasRole) {
      const { data: mgmtData } = await supabaseAdmin
        .from('users_management').select('role_id').eq('user_id', user.id).maybeSingle();
      if (mgmtData?.role_id) {
        const { data: extRoleData } = await supabaseAdmin
          .from('roles').select('name').eq('id', mgmtData.role_id).maybeSingle();
        if (extRoleData?.name && ALLOWED_ROLES.includes(extRoleData.name)) hasRole = true;
      }
    }

    if (!hasRole) {
      console.warn('[upload-media] forbidden', logCtx({ userId: user.id }));
      return reply(403, {
        error: 'Forbidden: your account is not allowed to upload media. Contact an admin.',
        code: 'ROLE_FORBIDDEN',
      }, correlationId);
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (e) {
      console.error('[upload-media] formdata-parse-failed', logCtx({ err: (e as Error).message }));
      return reply(400, {
        error: 'Could not parse upload payload. Please retry.',
        code: 'FORMDATA_PARSE',
      }, correlationId);
    }

    const file = formData.get('file') as File | null;
    const rawBucket = (formData.get('bucketName') as string | null) ?? 'gallery';
    const rawFolder = (formData.get('folderPath') as string | null) ?? 'uploads';

    const ALLOWED_BUCKETS = ['gallery', 'projects', 'teachers', 'blog', 'course-content', 'avatars'];
    if (!ALLOWED_BUCKETS.includes(rawBucket)) {
      return reply(400, { error: `Invalid bucket "${rawBucket}". Allowed: ${ALLOWED_BUCKETS.join(', ')}`, code: 'BUCKET_INVALID' }, correlationId);
    }
    const bucketName = rawBucket;
    const folderPath = rawFolder.replace(/\.\./g, '').replace(/[^a-zA-Z0-9_\-/]/g, '').replace(/^\/+|\/+$/g, '') || 'uploads';

    if (!file) {
      return reply(400, { error: 'No file provided', code: 'FILE_MISSING' }, correlationId);
    }

    const { mime, ext, category } = resolveMime(file);
    console.log('[upload-media] file-info', logCtx({
      userId: user.id, bucket: bucketName, folder: folderPath,
      name: file.name, ext, browserType: file.type, resolvedMime: mime, sizeBytes: file.size,
    }));

    if (!ALLOWED_MIME_TYPES.has(mime)) {
      return reply(415, {
        error: `Unsupported media type${ext ? ` ".${ext}"` : ''}${mime ? ` (${mime})` : ''}. Allowed: images (png/jpg/gif/webp/svg/avif/heic), videos (mp4/webm/mov/m4v/mkv/avi/3gp), audio (mp3/m4a/wav/ogg), and pdf.`,
        code: 'MIME_UNSUPPORTED',
        detected: { mime, ext },
      }, correlationId);
    }

    const limit = SIZE_LIMITS[category] ?? HARD_MAX;
    if (file.size > limit) {
      const sizeMb = (file.size / 1024 / 1024).toFixed(1);
      const limitMb = Math.round(limit / 1024 / 1024);
      return reply(413, {
        error: `File too large: ${sizeMb} MB. Limit for ${category} files is ${limitMb} MB.`,
        code: 'FILE_TOO_LARGE',
        sizeBytes: file.size, limitBytes: limit, category,
      }, correlationId);
    }

    // Hash for dedupe
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const fileHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    const { data: existingAsset, error: checkError } = await supabaseAdmin
      .from('media_assets').select('*').eq('file_hash', fileHash).eq('bucket_name', bucketName).maybeSingle();
    if (checkError) console.error('[upload-media] dedupe-check-failed', logCtx({ err: checkError.message }));

    if (existingAsset) {
      console.log('[upload-media] dedupe-hit', logCtx({ url: existingAsset.public_url }));
      return reply(200, {
        message: 'File detected and reused',
        url: existingAsset.public_url, path: existingAsset.file_path, reused: true, code: 'OK_REUSED',
      }, correlationId);
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${folderPath}/${fileName}`;
    const blob = new Blob([arrayBuffer], { type: mime });

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucketName).upload(filePath, blob, { contentType: mime, cacheControl: '3600', upsert: false });

    if (uploadError) {
      const msg = (uploadError as { message?: string })?.message || 'Upload failed';
      console.error('[upload-media] storage-upload-failed', logCtx({ err: msg, bucket: bucketName, path: filePath }));
      return reply(500, { error: `Storage upload failed: ${msg}`, code: 'STORAGE_UPLOAD' }, correlationId);
    }

    const { data: { publicUrl } } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filePath);

    const { error: insertError } = await supabaseAdmin
      .from('media_assets')
      .insert([{ file_hash: fileHash, bucket_name: bucketName, file_path: filePath, public_url: publicUrl, file_size: file.size, mime_type: mime }]);
    if (insertError) console.error('[upload-media] media-asset-insert-failed', logCtx({ err: insertError.message }));

    console.log('[upload-media] success', logCtx({ url: publicUrl, path: filePath }));
    return reply(200, {
      message: 'File uploaded successfully',
      url: publicUrl, path: filePath, reused: false, code: 'OK',
    }, correlationId);

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[upload-media] unhandled', logCtx({ err: msg, stack: err instanceof Error ? err.stack : undefined }));
    return reply(500, { error: msg, code: 'INTERNAL' }, correlationId);
  }
});
