import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
    origin === allowed || origin.endsWith('.lovable.app') || origin.endsWith('.netlify.app')
  );

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// HTML entity encoding for XSS prevention
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
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
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Innovation Club Website</p>
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
                This is an automated notification from Innovation Club contact form.
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
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Innovation Club</p>
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
              <p style="margin: 0; color: #374151; font-size: 16px; font-weight: 600;">The Innovation Club Team</p>
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

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contactData: ContactRequest = await req.json();
    const { name, email, message } = contactData;

    // Validate required fields
    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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
    const adminEmailResponse = await resend.emails.send({
      from: "Innovation Club <onboarding@resend.dev>",
      to: adminEmail.split(',').map(e => e.trim()),
      subject: `Contact Form: ${escapeHtml(name)}`,
      html: adminHtml,
      replyTo: email,
    });

    if (adminEmailResponse.error) {
      console.error("Admin email error:", adminEmailResponse.error);
    } else {
      console.log("Admin email sent:", adminEmailResponse.data?.id);
    }

    // Send confirmation to sender
    const senderEmailResponse = await resend.emails.send({
      from: "Innovation Club <onboarding@resend.dev>",
      to: [email],
      subject: "We received your message!",
      html: senderHtml,
    });

    if (senderEmailResponse.error) {
      console.error("Sender confirmation email error:", senderEmailResponse.error);
    } else {
      console.log("Sender confirmation email sent:", senderEmailResponse.data?.id);
    }

    // Check if at least one email was sent successfully
    const adminSuccess = !adminEmailResponse.error;
    const senderSuccess = !senderEmailResponse.error;

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
