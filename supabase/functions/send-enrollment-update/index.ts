import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const FROM_EMAIL = Deno.env.get("NOTIFICATION_FROM_EMAIL") || "onboarding@resend.dev";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(text: string): string {
  if (!text) return '';
  const htmlEntities: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

function generateEmailTemplate(name: string, subject: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f4f4f5;">
<table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td align="center" style="padding:40px 0;">
<table role="presentation" style="width:600px;max-width:100%;border-collapse:collapse;background-color:#ffffff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
<tr><td style="padding:40px 40px 20px;text-align:center;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);border-radius:12px 12px 0 0;">
<h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">Young Innovators Club</h1>
<p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Sparking Ideas, Building Tomorrow</p></td></tr>
<tr><td style="padding:40px;">
<h2 style="margin:0 0 16px;color:#1f2937;font-size:22px;font-weight:600;">Hello ${escapeHtml(name)}!</h2>
<div style="color:#4b5563;font-size:16px;line-height:1.6;">${escapeHtml(message).replace(/\n/g, '<br>')}</div></td></tr>
<tr><td style="padding:30px 40px;background-color:#f9fafb;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;">
<p style="margin:0 0 8px;color:#6b7280;font-size:14px;">Best regards,</p>
<p style="margin:0;color:#374151;font-size:16px;font-weight:600;">The Young Innovators Club Team</p>
<p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">This email was sent from Young Innovators Club. If you have any questions, please contact us.</p></td></tr>
</table></td></tr></table></body></html>`;
}

interface UpdateRequest {
  email: string;
  name: string;
  subject: string;
  message: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication - this is admin-only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Service temporarily unavailable" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const token = authHeader.replace("Bearer ", "");

    // Use service role client for admin verification
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: claimsData, error: claimsError } = await adminClient.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const userId = claimsData.user.id;

    // Verify admin role
    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("Admin check failed for user:", userId);
      return new Response(JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { email, name, subject, message }: UpdateRequest = await req.json();

    if (!email || !name || !subject || !message) {
      return new Response(JSON.stringify({ error: "All fields are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Validate FROM_EMAIL format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(FROM_EMAIL)) {
      console.error("Invalid FROM_EMAIL format:", FROM_EMAIL);
      return new Response(JSON.stringify({ error: "Email service misconfigured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    console.log("Sending update to:", email, "by admin:", userId);

    const htmlContent = generateEmailTemplate(name, subject, message);

    const emailResult = await resend.emails.send({
      from: `Young Innovators Club <${FROM_EMAIL}>`,
      to: [email],
      subject: subject,
      html: htmlContent,
    });

    if (emailResult.error) {
      console.error("Resend error:", emailResult.error);
      return new Response(JSON.stringify({ error: "Failed to send email. Please try again later." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    console.log("Email sent successfully:", emailResult.data?.id);

    return new Response(JSON.stringify({ success: true, id: emailResult.data?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error) {
    console.error("Error sending update:", error);
    return new Response(JSON.stringify({ error: "Failed to send update. Please try again later." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
