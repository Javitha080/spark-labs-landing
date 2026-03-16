import { Resend } from "resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const FROM_EMAIL = Deno.env.get("NOTIFICATION_FROM_EMAIL") || "onboarding@resend.dev";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limiting: max 5 requests per 15 minutes per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;

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

function escapeHtml(text: string): string {
  if (!text) return '';
  const htmlEntities: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

function validateInput(data: { name?: string; email?: string; message?: string }): { valid: boolean; error?: string } {
  if (!data.name || data.name.trim().length === 0) return { valid: false, error: 'Name is required' };
  if (data.name.length > 100) return { valid: false, error: 'Name must be less than 100 characters' };
  data.name = data.name.replace(/<[^>]*>/g, '').trim();

  if (!data.email) return { valid: false, error: 'Email is required' };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) return { valid: false, error: 'Invalid email format' };
  if (data.email.length > 254) return { valid: false, error: 'Email is too long' };

  if (!data.message || data.message.trim().length === 0) return { valid: false, error: 'Message is required' };
  if (data.message.length > 5000) return { valid: false, error: 'Message must be less than 5000 characters' };
  data.message = data.message.replace(/<[^>]*>/g, '').trim();

  return { valid: true };
}

interface ContactRequest {
  name: string;
  email: string;
  message: string;
}

function generateAdminEmailTemplate(data: ContactRequest): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>New Contact Message</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f4f4f5;">
<table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td align="center" style="padding:40px 0;">
<table role="presentation" style="width:600px;max-width:100%;border-collapse:collapse;background-color:#ffffff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
<tr><td style="padding:40px 40px 20px;text-align:center;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);border-radius:12px 12px 0 0;">
<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">New Contact Message</h1>
<p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Young Innovators Club Website</p></td></tr>
<tr><td style="padding:40px;">
<table role="presentation" style="width:100%;border-collapse:collapse;">
<tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;"><span style="color:#6b7280;font-size:14px;font-weight:500;">Name</span><p style="margin:4px 0 0;color:#1f2937;font-size:16px;font-weight:600;">${escapeHtml(data.name)}</p></td></tr>
<tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;"><span style="color:#6b7280;font-size:14px;font-weight:500;">Email</span><p style="margin:4px 0 0;color:#1f2937;font-size:16px;"><a href="mailto:${escapeHtml(data.email)}" style="color:#6366f1;">${escapeHtml(data.email)}</a></p></td></tr>
<tr><td style="padding:12px 0;"><span style="color:#6b7280;font-size:14px;font-weight:500;">Message</span><p style="margin:4px 0 0;color:#1f2937;font-size:16px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(data.message)}</p></td></tr>
</table></td></tr>
<tr><td style="padding:20px 40px;background-color:#f9fafb;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;text-align:center;">
<p style="margin:0;color:#9ca3af;font-size:12px;">This is an automated notification from Young Innovators Club contact form.</p></td></tr>
</table></td></tr></table></body></html>`;
}

function generateSenderConfirmationTemplate(name: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Message Received</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f4f4f5;">
<table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td align="center" style="padding:40px 0;">
<table role="presentation" style="width:600px;max-width:100%;border-collapse:collapse;background-color:#ffffff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
<tr><td style="padding:40px 40px 20px;text-align:center;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);border-radius:12px 12px 0 0;">
<h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">Message Received!</h1>
<p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Young Innovators Club</p></td></tr>
<tr><td style="padding:40px;">
<h2 style="margin:0 0 16px;color:#1f2937;font-size:22px;font-weight:600;">Thank you for reaching out, ${escapeHtml(name)}!</h2>
<p style="margin:0 0 16px;color:#4b5563;font-size:16px;line-height:1.6;">We have received your message and will get back to you as soon as possible.</p>
<p style="margin:0 0 24px;color:#4b5563;font-size:16px;line-height:1.6;">Our team typically responds within 1-2 business days.</p></td></tr>
<tr><td style="padding:30px 40px;background-color:#f9fafb;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;">
<p style="margin:0 0 8px;color:#6b7280;font-size:14px;">Best regards,</p>
<p style="margin:0;color:#374151;font-size:16px;font-weight:600;">The Young Innovators Club Team</p></td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIP = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(clientIP)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in 15 minutes." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const contactData: ContactRequest = await req.json();
    const validation = validateInput(contactData);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { name, email, message } = contactData;
    console.log("Processing contact message from:", name);

    const adminEmail = Deno.env.get("ADMIN_EMAIL");
    if (!adminEmail) {
      console.error("ADMIN_EMAIL not configured");
      return new Response(JSON.stringify({ error: "Unable to process message. Please try again later." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Validate FROM_EMAIL format
    const fromEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(FROM_EMAIL);
    if (!fromEmailValid) {
      console.error("Invalid FROM_EMAIL format:", FROM_EMAIL);
      return new Response(JSON.stringify({ error: "Email service misconfigured. Please try again later." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const adminHtml = generateAdminEmailTemplate(contactData);
    const senderHtml = generateSenderConfirmationTemplate(name);

    // Send both emails concurrently for speed
    const [adminResult, senderResult] = await Promise.allSettled([
      resend.emails.send({
        from: `Young Innovators Club <${FROM_EMAIL}>`,
        to: adminEmail.split(',').map(e => e.trim()),
        replyTo: email,
        subject: `Contact Form: ${name}`,
        html: adminHtml,
      }),
      resend.emails.send({
        from: `Young Innovators Club <${FROM_EMAIL}>`,
        to: [email],
        subject: "We received your message!",
        html: senderHtml,
      }),
    ]);

    const adminSuccess = adminResult.status === 'fulfilled' && !adminResult.value.error;
    const senderSuccess = senderResult.status === 'fulfilled' && !senderResult.value.error;

    if (adminResult.status === 'rejected') console.error("Admin email exception:", adminResult.reason);
    else if (adminResult.value.error) console.error("Admin email error:", adminResult.value.error);
    else console.log("Admin email sent:", adminResult.value.data?.id);

    if (senderResult.status === 'rejected') console.error("Sender email exception:", senderResult.reason);
    else if (senderResult.value.error) console.error("Sender email error:", senderResult.value.error);
    else console.log("Sender email sent:", senderResult.value.data?.id);

    if (!adminSuccess && !senderSuccess) {
      return new Response(JSON.stringify({ error: "Failed to send message. Please try again later." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    return new Response(JSON.stringify({ success: true, adminEmailSent: adminSuccess, senderEmailSent: senderSuccess }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error) {
    console.error("Error in send-contact-message:", error);
    return new Response(JSON.stringify({ error: "Failed to send message" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
