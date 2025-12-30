import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// CORS configuration - restrict to known origins
const ALLOWED_ORIGINS = [
  'https://spark-labs.lovable.app',
  'https://gtwqjuisdmbqlsjlatyj.lovable.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080'
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app')
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// Sanitize error messages for client responses
function getSafeErrorMessage(error: any): { message: string; code: string } {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Log full error server-side only
  console.error('Internal error:', errorMessage);
  
  // Map to safe client messages
  if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
    return { message: 'Service temporarily unavailable. Please try again later.', code: 'RATE_LIMITED' };
  }
  if (errorMessage.includes('auth') || errorMessage.includes('token') || errorMessage.includes('Authorization')) {
    return { message: 'Authentication failed. Please log in again.', code: 'AUTH_FAILED' };
  }
  if (errorMessage.includes('configuration') || errorMessage.includes('API_KEY') || errorMessage.includes('configured')) {
    return { message: 'Service temporarily unavailable. Please try again later.', code: 'SERVICE_ERROR' };
  }
  if (errorMessage.includes('Gateway') || errorMessage.includes('AI')) {
    return { message: 'AI service temporarily unavailable. Please try again later.', code: 'SERVICE_ERROR' };
  }
  
  // Generic fallback - never expose internal details
  return { message: 'An error occurred. Please try again or contact support.', code: 'INTERNAL_ERROR' };
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
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required', code: 'AUTH_REQUIRED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the JWT token with Supabase Auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable. Please try again later.', code: 'SERVICE_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Validate the user's JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.log('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired authentication token', code: 'AUTH_FAILED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    const { messages } = await req.json();
    
    // Basic input validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format', code: 'INVALID_INPUT' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit message count to prevent abuse
    if (messages.length > 50) {
      return new Response(
        JSON.stringify({ error: 'Too many messages in conversation', code: 'LIMIT_EXCEEDED' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable. Please try again later.', code: 'SERVICE_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an Innovation Assistant for Spark Labs at Dharmapala Vidyalaya. Your role is to:
1. Help students brainstorm and develop innovative project ideas
2. Provide basic code snippets and guidance for their inventions
3. Suggest improvements to existing projects
4. Explain STEM concepts in an easy-to-understand way
5. Encourage creativity and problem-solving

Focus on robotics, electronics, programming, and sustainable technology. Keep responses concise, educational, and inspiring. When providing code, use comments to explain what each part does.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.', code: 'RATE_LIMITED' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI usage limit reached. Please contact administrator.', code: 'USAGE_LIMIT' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI service temporarily unavailable. Please try again later.', code: 'SERVICE_ERROR' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    const safeError = getSafeErrorMessage(error);
    return new Response(
      JSON.stringify({ error: safeError.message, code: safeError.code }),
      { status: 500, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } }
    );
  }
});
