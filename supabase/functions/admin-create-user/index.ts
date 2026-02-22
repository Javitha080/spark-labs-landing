import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
const RATE_LIMIT = 10; // Lower limit for user creation
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

// Input validation
function validateInput(data: { email?: string; password?: string; fullName?: string; role?: string }): { valid: boolean; error?: string } {
  // Validate email
  if (!data.email) {
    return { valid: false, error: 'Email is required' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  if (data.email.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }

  // Validate password
  if (!data.password) {
    return { valid: false, error: 'Password is required' };
  }
  if (data.password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  if (data.password.length > 128) {
    return { valid: false, error: 'Password must be less than 128 characters' };
  }

  // Password complexity requirements
  const hasUpperCase = /[A-Z]/.test(data.password);
  const hasLowerCase = /[a-z]/.test(data.password);
  const hasNumbers = /\d/.test(data.password);

  if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
    return { valid: false, error: 'Password must contain uppercase, lowercase, and numbers' };
  }

  // Validate fullName
  if (data.fullName) {
    if (data.fullName.length > 100) {
      return { valid: false, error: 'Full name must be less than 100 characters' };
    }
    // Sanitize - remove HTML tags
    data.fullName = data.fullName.replace(/<[^>]*>/g, '').trim();
  }

  // Validate role
  const allowedRoles = ['admin', 'editor', 'content_creator', 'coordinator', 'user'];
  if (data.role && !allowedRoles.includes(data.role)) {
    return { valid: false, error: 'Invalid role specified' };
  }

  return { valid: true };
}

Deno.serve(async (req) => {
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
    const rateLimitKey = 'admin-create-user:' + clientIP;
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
    const { data: roleData } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .single();

    if (roleData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins can create users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();

    // Validate input
    const validation = validateInput(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
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

    const { email, password, fullName, role } = body;

    // Create user using admin API
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName || '',
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!newUser.user) {
      return new Response(
        JSON.stringify({ error: 'User creation failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 300));

    // Update profile with full name if provided
    if (fullName) {
      const { error: profileError } = await adminClient
        .from('profiles')
        .upsert({
          id: newUser.user.id,
          email: email,
          full_name: fullName
        });

      if (profileError) {
        console.error('Error updating profile:', profileError);
      }
    }

    // Assign role if provided
    if (role) {
      const { error: roleError } = await adminClient
        .from('user_roles')
        .insert({
          user_id: newUser.user.id,
          role: role,
        });

      if (roleError) {
        console.error('Error assigning role:', roleError);
        return new Response(
          JSON.stringify({ error: `User created but role assignment failed: ${roleError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
