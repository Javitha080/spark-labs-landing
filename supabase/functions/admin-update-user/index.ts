import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// Secure CORS configuration - only allow known origins
const ALLOWED_ORIGINS = [
  'https://dvpyic.dpdns.org',
  'https://yicdvp.lovable.app',
  'https://id-preview--96d2388b-f970-46ba-98b2-b67878c336df.lovable.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && (
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith('.lovable.app') ||
    origin.endsWith('.netlify.app')
  );

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

interface UpdateUserRequest {
  userId: string;
  fullName?: string;
  avatarUrl?: string;
  newPassword?: string;
}

// Rate limiting configuration
const RATE_LIMIT = 30;
const RATE_LIMIT_WINDOW = 60000; // 1 minute
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

// Input validation
function validateInput(data: UpdateUserRequest): { valid: boolean; error?: string } {
  // Validate userId format (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!data.userId || !uuidRegex.test(data.userId)) {
    return { valid: false, error: 'Invalid user ID format' };
  }

  // Validate fullName length
  if (data.fullName !== undefined) {
    if (data.fullName.length > 100) {
      return { valid: false, error: 'Full name must be less than 100 characters' };
    }
    // Sanitize fullName - remove HTML tags
    data.fullName = data.fullName.replace(/<[^>]*>/g, '').trim();
  }

  // Validate avatarUrl
  if (data.avatarUrl !== undefined && data.avatarUrl) {
    try {
      const url = new URL(data.avatarUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { valid: false, error: 'Invalid avatar URL protocol' };
      }
    } catch {
      return { valid: false, error: 'Invalid avatar URL format' };
    }
  }

  // Validate password strength
  if (data.newPassword) {
    if (data.newPassword.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters' };
    }
    if (data.newPassword.length > 128) {
      return { valid: false, error: 'Password must be less than 128 characters' };
    }
    // Check password complexity
    const hasUpperCase = /[A-Z]/.test(data.newPassword);
    const hasLowerCase = /[a-z]/.test(data.newPassword);
    const hasNumbers = /\d/.test(data.newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(data.newPassword);

    if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
      return { valid: false, error: 'Password must contain uppercase, lowercase, and numbers' };
    }
  }

  return { valid: true };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const rawIP = req.headers.get("x-forwarded-for") || "unknown";
    const clientIP = rawIP.replace(/[^a-fA-F0-9.:,]/g, '');
    const rateLimitKey = 'admin-update-user:' + clientIP;
    if (!checkRateLimit(rateLimitKey)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Admin update user: No auth header');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Validate JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: userError } = await adminClient.auth.getUser(token);

    if (userError || !requestingUser) {
      console.log('Admin update user: Invalid JWT');
      return new Response(
        JSON.stringify({ error: 'Invalid or expired authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestingUserId = requestingUser.id;

    // Parse request body
    const body: UpdateUserRequest = await req.json();

    // Validate input
    const validation = validateInput(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, fullName, avatarUrl, newPassword } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Allow self-updates without admin role
    const isSelfUpdate = userId === requestingUserId;

    if (!isSelfUpdate) {
      const { data: roleData } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', requestingUserId)
        .single();

      if (!roleData || roleData.role !== 'admin') {
        console.log('Admin update user: Non-admin attempt by', requestingUserId);
        return new Response(
          JSON.stringify({ error: 'Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Updating user:', userId, 'by:', requestingUserId, 'self:', isSelfUpdate);

    // Update profile
    if (fullName !== undefined || avatarUrl !== undefined) {
      const updateData: { full_name?: string; avatar_url?: string } = {};
      if (fullName !== undefined) updateData.full_name = fullName;
      if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl;

      const { error: profileError } = await adminClient
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw new Error('Failed to update profile');
      }
    }

    // Update password
    if (newPassword) {
      const { error: passwordError } = await adminClient.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (passwordError) {
        console.error('Error updating password:', passwordError);
        throw new Error('Failed to update password');
      }
    }

    console.log('Successfully updated user:', userId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User updated successfully',
        updated: {
          profile: fullName !== undefined || avatarUrl !== undefined,
          password: !!newPassword
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin update user error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
