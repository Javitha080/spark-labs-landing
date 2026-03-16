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
    origin.endsWith('.netlify.app') ||
    origin.endsWith('.dpdns.org')
  );

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function getSafeErrorMessage(error: unknown): { message: string; code: string } {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('Internal error:', errorMessage);

  if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
    return { message: 'Service temporarily unavailable. Please try again later.', code: 'RATE_LIMITED' };
  }
  if (errorMessage.includes('auth') || errorMessage.includes('token')) {
    return { message: 'Authentication failed. Please log in again.', code: 'AUTH_FAILED' };
  }
  return { message: 'An error occurred. Please try again.', code: 'INTERNAL_ERROR' };
}

interface BlogAIRequest {
  action: 'generate_content' | 'generate_title' | 'improve_content' | 'generate_excerpt';
  prompt: string;
  tone?: string;
  existingContent?: string;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Authentication failed: Auth session missing!');
      return new Response(
        JSON.stringify({ error: 'Authorization required', code: 'AUTH_REQUIRED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable.', code: 'SERVICE_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await adminClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.log('Authentication failed: Invalid JWT claims', claimsError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired authentication token', code: 'AUTH_FAILED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub as string;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token', code: 'AUTH_FAILED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has content creator, editor, or admin role
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    const allowedRoles = ['admin', 'content_creator', 'editor'];

    if (!roleData || !allowedRoles.includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions to use the AI assistant.', code: 'FORBIDDEN' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user for blog AI:', userId, 'role:', roleData.role);

    const body: BlogAIRequest = await req.json();
    const { action, prompt, tone = 'professional', existingContent } = body;

    if (!action || !prompt) {
      return new Response(
        JSON.stringify({ error: 'Action and prompt are required', code: 'INVALID_INPUT' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable.', code: 'SERVICE_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'generate_content':
        systemPrompt = `You are an expert blog writer for Young Innovation Club. Write engaging, informative blog posts about innovation, technology, and student projects.
Style guidelines:
- Tone: ${tone}
- Use clear headings (h2, h3)
- Include engaging introduction and conclusion
- Use bullet points and numbered lists where appropriate
- Keep paragraphs concise
- Target length: 800-1200 words
- Format output as clean HTML (no markdown, no code blocks)
- End the post with: <br><br><i>© 2026 Young Innovation Club, Dharmapala Vidyalaya Pannipitiya. All rights reserved.</i>`;
        userPrompt = `Write a detailed blog post about: "${prompt}"\nReturn ONLY the HTML content. Start with the first paragraph directly (no h1 title - that will be added separately).`;
        break;
      case 'generate_title':
        systemPrompt = 'You are a creative headline writer. Generate catchy, SEO-friendly blog post titles.';
        userPrompt = `Generate 5 compelling blog post titles for the following topic. Return ONLY the titles, one per line, no numbering:\n\nTopic: ${prompt}`;
        break;
      case 'improve_content':
        systemPrompt = `You are an expert editor. Improve the given content while maintaining the original message and ${tone} tone. Fix grammar, enhance clarity, and improve flow.`;
        userPrompt = `Improve this content:\n\n${existingContent}\n\nAdditional context: ${prompt}\n\nReturn the improved HTML content only.`;
        break;
      case 'generate_excerpt':
        systemPrompt = 'You are a skilled summarizer. Create engaging blog post excerpts that entice readers to read more.';
        userPrompt = `Create a compelling 2-3 sentence excerpt for this blog post:\n\n${existingContent || prompt}\n\nReturn ONLY the excerpt text, no quotes or labels.`;
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action', code: 'INVALID_INPUT' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log('Calling Lovable AI Gateway for action:', action);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
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
            { role: 'user', content: userPrompt },
          ],
          stream: action === 'generate_content',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. Please try again later.', code: 'RATE_LIMITED' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: 'AI service credits exhausted. Please try again later.', code: 'PAYMENT_REQUIRED' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const errorText = await response.text();
        console.error('AI Gateway error:', response.status, errorText);
        return new Response(
          JSON.stringify({ error: 'AI service temporarily unavailable.', code: 'SERVICE_ERROR' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (action === 'generate_content') {
        return new Response(response.body, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || '';

      return new Response(
        JSON.stringify({ content, action }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (fetchError) {
      clearTimeout(timeout);
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
        return new Response(
          JSON.stringify({ error: 'AI request timed out. Please try again.', code: 'TIMEOUT' }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw fetchError;
    }
  } catch (error) {
    const corsHeaders = getCorsHeaders(req.headers.get('origin'));
    const safeError = getSafeErrorMessage(error);
    return new Response(
      JSON.stringify({ error: safeError.message, code: safeError.code }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
