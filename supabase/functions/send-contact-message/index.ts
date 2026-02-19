import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Cloudflare Email API configuration
const CLOUDFLARE_API_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
const CLOUDFLARE_ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
const CLOUDFLARE_EMAIL_DOMAIN = Deno.env.get("CLOUDFLARE_EMAIL_DOMAIN");
if (!CLOUDFLARE_EMAIL_DOMAIN) {
  console.warn("CLOUDFLARE_EMAIL_DOMAIN not set; email sending may fail.");
}

// CORS configuration - explicit allowlist only (no wildcards)
const PRODUCTION_ORIGINS = [
  'https://dvpyic.dpdns.org',
  'https://spark-labs.lovable.app',
  'https://gtwqjuisdmbqlsjlatyj.lovable.app',
];
const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080'];
const ALLOWED_ORIGINS = Deno.env.get("ENVIRONMENT") === "development"
  ? [...PRODUCTION_ORIGINS, ...DEV_ORIGINS]
  : PRODUCTION_ORIGINS;

// Rate limiting: max 5 requests per 15 minutes per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

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
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : (ALLOWED_ORIGINS[0] ?? "*"),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// HTML entity encoding for XSS prevention
function escapeHtml(text: string): string {
  if (!text) return '';
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

// Input validation
function validateInput(data: { name?: string; email?: string; message?: string }): { valid: boolean; error?: string } {
  // Validate name
  if (!data.name || data.name.trim().length === 0) {
    return { valid: false, error: 'Name is required' };
  }
  if (data.name.length > 100) {
    return { valid: false, error: 'Name must be less than 100 characters' };
  }
  // Remove HTML tags from name
  data.name = data.name.replace(/<[^>]*>/g, '').trim();

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

  // Validate message
  if (!data.message || data.message.trim().length === 0) {
    return { valid: false, error: 'Message is required' };
  }
  if (data.message.length > 5000) {
    return { valid: false, error: 'Message must be less than 5000 characters' };
  }
  // Remove HTML tags from message
  data.message = data.message.replace(/<[^>]*>/g, '').trim();

  return { valid: true };
}

// Email template for admin notification
function generateAdminEmailTemplate(data: ContactRequest): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Message</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">New Contact Message</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Young Innovators Club Website</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="color: #6b7280; font-size: 14px; font-weight: 500;">Name</span>
                    <p style="margin: 4px 0 0; color: #1f2937; font-size: 16px; font-weight: 600;">${escapeHtml(data.name)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="color: #6b7280; font-size: 14px; font-weight: 500;">Email</span>
                    <p style="margin: 4px 0 0; color: #1f2937; font-size: 16px;"><a href="mailto:${escapeHtml(data.email)}" style="color: #6366f1;">${escapeHtml(data.email)}</a></p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <span style="color: #6b7280; font-size: 14px; font-weight: 500;">Message</span>
                    <p style="margin: 4px 0 0; color: #1f2937; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(data.message)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                This is an automated notification from Young Innovators Club contact form.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Email template for sender confirmation
function generateSenderConfirmationTemplate(name: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Message Received</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Message Received!</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Young Innovators Club</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 22px; font-weight: 600;">Thank you for reaching out, ${escapeHtml(name)}!</h2>
              <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                We have received your message and will get back to you as soon as possible.
              </p>
              <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Our team typically responds within 1-2 business days.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">Best regards,</p>
              <p style="margin: 0; color: #374151; font-size: 16px; font-weight: 600;">The Young Innovators Club Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

interface ContactRequest {
  name: string;
  email: string;
  message: string;
}

// Send email using Cloudflare Email API
async function sendCloudflareEmail(
  to: string[],
  subject: string,
  html: string,
  fromName: string = "Young Innovators Club",
  replyTo?: string
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    // Check if Cloudflare credentials are available
    if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
      console.error("Cloudflare Email credentials not configured");
      return { success: false, error: "Email service not configured" };
    }
    if (!CLOUDFLARE_EMAIL_DOMAIN) {
      console.error("CLOUDFLARE_EMAIL_DOMAIN not set");
      return { success: false, error: "Email domain not configured" };
    }

    const fromEmail = `noreply@${CLOUDFLARE_EMAIL_DOMAIN}`;
    
    // Cloudflare Email Sending API
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/email/routing/send`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: { email: fromEmail, name: fromName },
          to: to.map(email => ({ email })),
          ...(replyTo && { reply_to: { email: replyTo } }),
          subject: subject,
          content: [
            {
              type: "text/html",
              value: html,
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error("Cloudflare Email API error:", data);
      return { 
        success: false, 
        error: data.errors?.[0]?.message || "Failed to send email" 
      };
    }

    return { 
      success: true, 
      id: data.result?.id || "unknown" 
    };
  } catch (error) {
    console.error("Error sending email via Cloudflare:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting check
    const clientIP = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again in 15 minutes." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const contactData: ContactRequest = await req.json();

    // Validate input
    const validation = validateInput(contactData);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { name, email, message } = contactData;

    console.log("Processing contact message from:", escapeHtml(name));

    // Get admin email from environment variable
    const adminEmail = Deno.env.get("ADMIN_EMAIL");

    if (!adminEmail) {
      console.error("ADMIN_EMAIL environment variable not configured");
      return new Response(
        JSON.stringify({ error: "Unable to process message. Please try again later." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate HTML emails
    const adminHtml = generateAdminEmailTemplate(contactData);
    const senderHtml = generateSenderConfirmationTemplate(name);

    // Send notification to admin
    const adminEmailResponse = await sendCloudflareEmail(
      adminEmail.split(',').map(e => e.trim()),
      `Contact Form: ${escapeHtml(name)}`,
      adminHtml,
      "Young Innovators Club",
      email
    );

    if (!adminEmailResponse.success) {
      console.error("Admin email error:", adminEmailResponse.error);
    } else {
      console.log("Admin email sent:", adminEmailResponse.id);
    }

    // Send confirmation to sender
    const senderEmailResponse = await sendCloudflareEmail(
      [email],
      "We received your message!",
      senderHtml
    );

    if (!senderEmailResponse.success) {
      console.error("Sender confirmation email error:", senderEmailResponse.error);
    } else {
      console.log("Sender confirmation email sent:", senderEmailResponse.id);
    }

    // Check if at least one email was sent successfully
    const adminSuccess = adminEmailResponse.success;
    const senderSuccess = senderEmailResponse.success;

    if (!adminSuccess && !senderSuccess) {
      return new Response(
        JSON.stringify({ error: "Failed to send message. Please try again later." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(JSON.stringify({
      success: true,
      adminEmailSent: adminSuccess,
      senderEmailSent: senderSuccess
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-contact-message:", error);

    return new Response(
      JSON.stringify({ error: "Failed to send message" }),
      { status: 500, headers: { "Content-Type": "application/json", ...getCorsHeaders(req.headers.get("origin")) } }
    );
  }
};

serve(handler);
