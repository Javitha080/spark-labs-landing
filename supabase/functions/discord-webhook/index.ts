const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting: max 30 requests per minute
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30;
const RATE_LIMIT_WINDOW = 60000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  return true;
}

function escapeMarkdown(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\*/g, "\\*")
    .replace(/_/g, "\\_")
    .replace(/~/g, "\\~")
    .replace(/`/g, "\\`")
    .replace(/\|/g, "\\|")
    .replace(/@/g, "\\@")
    .slice(0, 1000);
}

interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
  timestamp?: string;
}

interface WebhookPayload {
  type: "enrollment" | "contact" | "blog" | "event";
  data: Record<string, string | number | boolean>;
}

const COLORS = {
  enrollment: 0x10b981,
  contact: 0x6366f1,
  blog: 0x3b82f6,
  event: 0xf59e0b,
};

const ICONS = {
  enrollment: "📝",
  contact: "💬",
  blog: "📰",
  event: "📅",
};

function buildEmbed(type: WebhookPayload["type"], data: Record<string, string>): DiscordEmbed {
  const base = { color: COLORS[type], footer: { text: "YICDVP Innovation Club" }, timestamp: new Date().toISOString() };

  switch (type) {
    case "enrollment":
      return { ...base, title: `${ICONS.enrollment} New Enrollment Submission`, description: `**${escapeMarkdown(data.name || "Unknown")}** has submitted an enrollment application!`,
        fields: [
          { name: "📧 Email", value: escapeMarkdown(data.email || "N/A"), inline: true },
          { name: "📚 Grade", value: escapeMarkdown(data.grade || "N/A"), inline: true },
          { name: "🎯 Interest", value: escapeMarkdown(data.interest || "N/A"), inline: true },
        ] };
    case "contact":
      return { ...base, title: `${ICONS.contact} New Contact Message`, description: `**${escapeMarkdown(data.name || "Someone")}** sent a message via the contact form.`,
        fields: [
          { name: "📧 Email", value: escapeMarkdown(data.email || "N/A"), inline: true },
          { name: "💬 Message Preview", value: escapeMarkdown((data.message || "").slice(0, 200) + "..."), inline: false },
        ] };
    case "blog":
      return { ...base, title: `${ICONS.blog} Blog Post Published`, description: `A new blog post has been published!`,
        fields: [
          { name: "📝 Title", value: escapeMarkdown(data.title || "Untitled"), inline: false },
          { name: "✍️ Author", value: escapeMarkdown(data.author || "Anonymous"), inline: true },
        ] };
    case "event":
      return { ...base, title: `${ICONS.event} New Event Created`, description: `A new event has been scheduled!`,
        fields: [
          { name: "🎉 Event", value: escapeMarkdown(data.title || "Untitled Event"), inline: false },
          { name: "📅 Date", value: escapeMarkdown(data.date || "TBD"), inline: true },
          { name: "📍 Location", value: escapeMarkdown(data.location || "TBD"), inline: true },
        ] };
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIP = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const discordWebhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL");
    if (!discordWebhookUrl) {
      console.log("Discord webhook URL not configured, skipping notification");
      return new Response(
        JSON.stringify({ success: true, message: "Discord notifications not configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const payload: WebhookPayload = await req.json();
    const { type, data } = payload;

    if (!type || !data) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type and data" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const validTypes = ["enrollment", "contact", "blog", "event"];
    if (!validTypes.includes(type)) {
      return new Response(
        JSON.stringify({ error: "Invalid notification type" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const embed = buildEmbed(type, data as Record<string, string>);

    const discordResponse = await fetch(discordWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "YICDVP Bot",
        avatar_url: "https://yicdvp.lovable.app/favicon.ico",
        embeds: [embed],
      }),
    });

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      console.error("Discord webhook error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send Discord notification" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Discord notification sent: ${type}`);

    return new Response(
      JSON.stringify({ success: true, type }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Discord webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
