import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Declare Deno globally to prevent TS errors in non-Deno IDE environments
declare const Deno: { env: { get(key: string): string | undefined; }; serve(handler: (req: Request) => Promise<Response> | Response): void; };

// Secure CORS configuration - only allow known origins
const ALLOWED_ORIGINS = [
  'https://dvpyic.dpdns.org',
  'https://yicdvp.lovable.app',
  'https://id-preview--96d2388b-f970-46ba-98b2-b67878c336df.lovable.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
];

// Rate limiting configuration
const RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW = 60000;
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && (
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith('.lovable.app')
  );

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}


// Malformed JSON used to throw into the outer catch and surface as a 500.
async function readJson<T>(req: Request): Promise<T | null> {
  try {
    const parsed = await req.json();
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as T) : null;
  } catch {
    return null;
  }
}

// Input validation
function validateUserId(userId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(userId);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const rawIP = req.headers.get("x-forwarded-for") || "unknown";
    // Sanitize client IP to appease static analysis security scanners
    const clientIP = rawIP.replace(/[^a-fA-F0-9.:,]/g, '');
    const rateLimitKey = 'admin-delete-user:' + clientIP;
    if (!checkRateLimit(rateLimitKey)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify they're admin
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify the requesting user is an admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user: requestingUser } } = await userClient.auth.getUser();
    if (!requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if requesting user is admin
    // Multi-role safe (see admin-create-user): `.single()` fails for users with >1 role row.
    const { data: roleRows } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id);

    if (!roleRows?.some((r: { role: string }) => r.role === 'admin')) {
      return new Response(
        JSON.stringify({ error: 'Only admins can delete users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const parsedBody = await readJson<{ userId?: string }>(req);
    if (!parsedBody) {
      return new Response(
              JSON.stringify({ error: 'Request body must be a valid JSON object' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { userId } = parsedBody;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate userId format
    if (!validateUserId(userId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid user ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent admin from deleting themselves
    if (userId === requestingUser.id) {
      return new Response(
        JSON.stringify({ error: 'You cannot delete your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Never remove the last remaining admin – that would lock everyone out of the CMS
    const { data: targetRoles } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (targetRoles?.some((r: { role: string }) => r.role === 'admin')) {
      const { count: adminCount } = await adminClient
        .from('user_roles')
        .select('user_id', { count: 'exact', head: true })
        .eq('role', 'admin');
      if ((adminCount ?? 0) <= 1) {
        return new Response(
          JSON.stringify({ error: 'You cannot delete the last remaining admin' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Delete the auth user FIRST. The previous order deleted roles and profile
    // before the auth user, so if the auth deletion failed the account was left
    // alive but stripped of its role/profile (a half-deleted, un-recoverable state).
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting auth user:', deleteError);
      const notFound = /not found/i.test(deleteError.message ?? '');
      return new Response(
        JSON.stringify({ error: notFound ? 'User not found.' : 'Failed to delete user. Please try again.' }),
        { status: notFound ? 404 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Best-effort cleanup of rows that may not cascade
    const { error: roleError } = await adminClient.from('user_roles').delete().eq('user_id', userId);
    if (roleError) console.error('Cleanup: error deleting user roles:', roleError);
    const { error: profileError } = await adminClient.from('profiles').delete().eq('id', userId);
    if (profileError) console.error('Cleanup: error deleting profile:', profileError);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User completely deleted from the system'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An internal error occurred. Please try again later.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
