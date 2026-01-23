import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// Secure CORS configuration
const ALLOWED_ORIGINS = [
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

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Authorization header
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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Validate the requesting user's JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await adminClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.log('Admin update user: Invalid JWT');
      return new Response(
        JSON.stringify({ error: 'Invalid or expired authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestingUserId = claimsData.claims.sub as string;

    // Check if requesting user is an admin
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

    // Parse request body
    const body: UpdateUserRequest = await req.json();
    const { userId, fullName, avatarUrl, newPassword } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin updating user:', userId, 'by admin:', requestingUserId);

    // Update profile if fullName or avatarUrl provided
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

    // Update password if provided
    if (newPassword) {
      if (newPassword.length < 6) {
        return new Response(
          JSON.stringify({ error: 'Password must be at least 6 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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
