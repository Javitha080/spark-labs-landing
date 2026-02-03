import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const DISCORD_WEBHOOK_URL = Deno.env.get("DISCORD_WEBHOOK_URL");

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting: max 5 messages per minute per event type
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(eventType: string): boolean {
  const now = Date.now();
  const key = eventType;
  const limit = rateLimitStore.get(key);
  
  if (!limit || limit.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + 60000 });
    return true;
  }
  
  if (limit.count >= 5) {
    return false;
  }
  
  limit.count++;
  return true;
}

// HTML entity encoding for safety
function escapeMarkdown(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`')
    .replace(/\|/g, '\\|');
}

interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
  timestamp?: string;
}

interface NotificationPayload {
  event_type: 'enrollment' | 'contact' | 'blog_published' | 'user_registered';
  data: Record<string, unknown>;
}

function createEmbed(payload: NotificationPayload): DiscordEmbed {
  const { event_type, data } = payload;
  const timestamp = new Date().toISOString();
  
  switch (event_type) {
    case 'enrollment':
      return {
        title: "🎓 New Student Enrollment",
        description: `A new student has enrolled in the Innovation Club!`,
        color: 0x6366F1, // Primary purple
        fields: [
          { name: "Name", value: escapeMarkdown(String(data.name || 'Unknown')), inline: true },
          { name: "Grade", value: escapeMarkdown(String(data.grade || 'N/A')), inline: true },
          { name: "Interest", value: escapeMarkdown(String(data.interest || 'N/A')), inline: true },
          { name: "Email", value: escapeMarkdown(String(data.email || 'N/A')), inline: false },
        ],
        footer: { text: "YICDVP Innovation Club" },
        timestamp,
      };
      
    case 'contact':
      return {
        title: "📬 New Contact Message",
        description: `Someone reached out through the contact form.`,
        color: 0x10B981, // Green
        fields: [
          { name: "From", value: escapeMarkdown(String(data.name || 'Unknown')), inline: true },
          { name: "Email", value: escapeMarkdown(String(data.email || 'N/A')), inline: true },
          { name: "Message", value: escapeMarkdown(String(data.message || 'No message').substring(0, 500)), inline: false },
        ],
        footer: { text: "YICDVP Innovation Club" },
        timestamp,
      };
      
    case 'blog_published':
      return {
        title: "📝 New Blog Post Published",
        description: `A new article is now live on the blog!`,
        color: 0xF59E0B, // Amber
        fields: [
          { name: "Title", value: escapeMarkdown(String(data.title || 'Untitled')), inline: false },
          { name: "Author", value: escapeMarkdown(String(data.author || 'Unknown')), inline: true },
          { name: "Category", value: escapeMarkdown(String(data.category || 'General')), inline: true },
        ],
        footer: { text: "YICDVP Innovation Club Blog" },
        timestamp,
      };
      
    case 'user_registered':
      return {
        title: "👤 New Admin User Registered",
        description: `A new admin user has been created.`,
        color: 0xEF4444, // Red (for admin alerts)
        fields: [
          { name: "Email", value: escapeMarkdown(String(data.email || 'Unknown')), inline: true },
          { name: "Role", value: escapeMarkdown(String(data.role || 'user')), inline: true },
        ],
        footer: { text: "YICDVP Admin System" },
        timestamp,
      };
      
    default:
      return {
        title: "📢 Notification",
        description: "An event occurred in the YICDVP system.",
        color: 0x6B7280, // Gray
        footer: { text: "YICDVP Innovation Club" },
        timestamp,
      };
  }
}

async function sendDiscordMessage(embed: DiscordEmbed): Promise<Response> {
  if (!DISCORD_WEBHOOK_URL) {
    console.warn("DISCORD_WEBHOOK_URL not configured");
    return new Response(
      JSON.stringify({ error: "Discord webhook not configured" }),
      { status: 503, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
  
  const response = await fetch(DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: "YICDVP Bot",
      avatar_url: "https://yicdvp.lovable.app/favicon.ico",
      embeds: [embed],
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Discord API error:", errorText);
    throw new Error(`Discord API error: ${response.status}`);
  }
  
  return response;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const payload: NotificationPayload = await req.json();
    
    // Validate payload
    if (!payload.event_type || !payload.data) {
      return new Response(
        JSON.stringify({ error: "Invalid payload: missing event_type or data" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Check rate limit
    if (!checkRateLimit(payload.event_type)) {
      console.warn(`Rate limit exceeded for event type: ${payload.event_type}`);
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded", success: false }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Create and send embed
    const embed = createEmbed(payload);
    await sendDiscordMessage(embed);
    
    console.log(`Discord notification sent for event: ${payload.event_type}`);
    
    return new Response(
      JSON.stringify({ success: true, event_type: payload.event_type }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
    
  } catch (error) {
    console.error("Error in discord-webhook:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Failed to send notification",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
