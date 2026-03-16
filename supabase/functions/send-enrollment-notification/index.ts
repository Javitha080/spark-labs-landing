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

interface EnrollmentRequest {
  name: string;
  email: string;
  grade: string;
  phone: string;
  interest: string;
  reason: string;
}

function generateAdminEmailTemplate(data: EnrollmentRequest): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>New Enrollment Submission</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f4f4f5;">
<table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td align="center" style="padding:40px 0;">
<table role="presentation" style="width:600px;max-width:100%;border-collapse:collapse;background-color:#ffffff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
<tr><td style="padding:40px 40px 20px;text-align:center;background:linear-gradient(135deg,#059669 0%,#10b981 100%);border-radius:12px 12px 0 0;">
<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">New Enrollment Submission</h1>
<p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Young Innovators Club</p></td></tr>
<tr><td style="padding:40px;">
<table role="presentation" style="width:100%;border-collapse:collapse;">
<tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;"><span style="color:#6b7280;font-size:14px;font-weight:500;">Name</span><p style="margin:4px 0 0;color:#1f2937;font-size:16px;font-weight:600;">${escapeHtml(data.name)}</p></td></tr>
<tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;"><span style="color:#6b7280;font-size:14px;font-weight:500;">Email</span><p style="margin:4px 0 0;color:#1f2937;font-size:16px;"><a href="mailto:${escapeHtml(data.email)}" style="color:#6366f1;">${escapeHtml(data.email)}</a></p></td></tr>
<tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;"><span style="color:#6b7280;font-size:14px;font-weight:500;">Grade</span><p style="margin:4px 0 0;color:#1f2937;font-size:16px;">${escapeHtml(data.grade)}</p></td></tr>
<tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;"><span style="color:#6b7280;font-size:14px;font-weight:500;">Phone</span><p style="margin:4px 0 0;color:#1f2937;font-size:16px;">${escapeHtml(data.phone)}</p></td></tr>
<tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;"><span style="color:#6b7280;font-size:14px;font-weight:500;">Interest Area</span><p style="margin:4px 0 0;color:#1f2937;font-size:16px;">${escapeHtml(data.interest)}</p></td></tr>
<tr><td style="padding:12px 0;"><span style="color:#6b7280;font-size:14px;font-weight:500;">Reason for Joining</span><p style="margin:4px 0 0;color:#1f2937;font-size:16px;line-height:1.6;">${escapeHtml(data.reason)}</p></td></tr>
</table></td></tr>
<tr><td style="padding:20px 40px;background-color:#f9fafb;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;text-align:center;">
<p style="margin:0;color:#9ca3af;font-size:12px;">This is an automated notification from Young Innovators Club enrollment system.</p></td></tr>
</table></td></tr></table></body></html>`;
}

function generateStudentEmailTemplate(name: string, interest: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Welcome to Young Innovators Club</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f4f4f5;">
<table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td align="center" style="padding:40px 0;">
<table role="presentation" style="width:600px;max-width:100%;border-collapse:collapse;background-color:#ffffff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
<tr><td style="padding:40px 40px 20px;text-align:center;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);border-radius:12px 12px 0 0;">
<h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">Welcome to YIC!</h1>
<p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Sparking Ideas, Building Tomorrow</p></td></tr>
<tr><td style="padding:40px;">
<h2 style="margin:0 0 16px;color:#1f2937;font-size:22px;font-weight:600;">Thank you for your enrollment, ${escapeHtml(name)}!</h2>
<p style="margin:0 0 16px;color:#4b5563;font-size:16px;line-height:1.6;">We are thrilled to receive your application and are excited about your interest in <strong style="color:#6366f1;">${escapeHtml(interest)}</strong>.</p>
<p style="margin:0 0 24px;color:#4b5563;font-size:16px;line-height:1.6;">Our team will carefully review your application and get back to you soon with the next steps.</p>
<table role="presentation" style="width:100%;border-collapse:collapse;background-color:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
<tr><td style="padding:20px;"><h3 style="margin:0 0 12px;color:#166534;font-size:16px;font-weight:600;">What happens next?</h3>
<ul style="margin:0;padding:0 0 0 20px;color:#4b5563;font-size:14px;line-height:1.8;">
<li>Our team reviews your application</li><li>You will receive an email with our decision</li><li>If approved, you will get onboarding information</li></ul></td></tr></table>
</td></tr>
<tr><td style="padding:30px 40px;background-color:#f9fafb;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;">
<p style="margin:0 0 8px;color:#6b7280;font-size:14px;">Best regards,</p>
<p style="margin:0;color:#374151;font-size:16px;font-weight:600;">The Young Innovators Club Team</p>
<p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">If you have any questions, feel free to reply to this email.</p></td></tr>
</table></td></tr></table></body></html>`;
}

async function sendDiscordNotification(data: EnrollmentRequest): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseKey) return;

    await fetch(`${supabaseUrl}/functions/v1/discord-webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
      body: JSON.stringify({ type: "enrollment", data: { name: data.name, email: data.email, grade: data.grade, phone: data.phone, interest: data.interest } }),
    });
  } catch (error) {
    console.log("Discord notification error (non-critical):", error);
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const enrollmentData: EnrollmentRequest = await req.json();
    const { name, email, grade, phone, interest, reason } = enrollmentData;

    if (!name || !email || !grade || !phone || !interest || !reason) {
      return new Response(JSON.stringify({ error: "All fields are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Validate FROM_EMAIL format
    const fromEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(FROM_EMAIL);
    if (!fromEmailValid) {
      console.error("Invalid FROM_EMAIL format:", FROM_EMAIL);
      return new Response(JSON.stringify({ error: "Email service misconfigured. Please try again later." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    console.log("Processing enrollment for:", name);

    const adminEmail = Deno.env.get("ADMIN_EMAIL");
    if (!adminEmail) {
      console.error("ADMIN_EMAIL not configured");
      return new Response(JSON.stringify({ error: "Unable to process enrollment. Please try again later." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const adminHtml = generateAdminEmailTemplate(enrollmentData);
    const studentHtml = generateStudentEmailTemplate(name, interest);

    // Send both emails concurrently for speed
    const [adminResult, studentResult] = await Promise.allSettled([
      resend.emails.send({
        from: `Young Innovators Club <${FROM_EMAIL}>`,
        to: adminEmail.split(',').map(e => e.trim()),
        subject: `New Enrollment: ${name}`,
        html: adminHtml,
      }),
      resend.emails.send({
        from: `Young Innovators Club <${FROM_EMAIL}>`,
        to: [email],
        subject: "Welcome to Young Innovators Club!",
        html: studentHtml,
      }),
    ]);

    const adminSuccess = adminResult.status === 'fulfilled' && !adminResult.value.error;
    const studentSuccess = studentResult.status === 'fulfilled' && !studentResult.value.error;

    if (adminResult.status === 'rejected') console.error("Admin email exception:", adminResult.reason);
    else if (adminResult.value.error) console.error("Admin email error:", adminResult.value.error);
    else console.log("Admin email sent:", adminResult.value.data?.id);

    if (studentResult.status === 'rejected') console.error("Student email exception:", studentResult.reason);
    else if (studentResult.value.error) console.error("Student email error:", studentResult.value.error);
    else console.log("Student email sent:", studentResult.value.data?.id);

    if (!adminSuccess && !studentSuccess) {
      return new Response(JSON.stringify({ error: "Failed to send notification emails." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Discord notification (non-blocking)
    sendDiscordNotification(enrollmentData).catch(console.error);

    return new Response(JSON.stringify({ success: true, adminEmailSent: adminSuccess, studentEmailSent: studentSuccess }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error) {
    console.error("Error in send-enrollment-notification:", error);
    return new Response(JSON.stringify({ error: "Failed to send notification" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
