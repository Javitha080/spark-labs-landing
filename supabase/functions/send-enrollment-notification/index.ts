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
    origin === allowed || origin.endsWith('.lovable.app')
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

interface EnrollmentRequest {
  name: string;
  email: string;
  grade: string;
  phone: string;
  interest: string;
  reason: string;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, grade, phone, interest, reason }: EnrollmentRequest = await req.json();

    // Validate required fields
    if (!name || !email || !grade || !phone || !interest || !reason) {
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

    // Sanitize all user inputs for HTML
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeGrade = escapeHtml(grade);
    const safePhone = escapeHtml(phone);
    const safeInterest = escapeHtml(interest);
    const safeReason = escapeHtml(reason);

    console.log("Processing enrollment for:", safeName);

    // Get admin email from environment variable
    const adminEmail = Deno.env.get("ADMIN_EMAIL");
    const fromEmail = Deno.env.get("NOTIFICATION_FROM_EMAIL") || "onboarding@resend.dev";
    
    if (!adminEmail) {
      console.error("ADMIN_EMAIL environment variable not configured");
      return new Response(
        JSON.stringify({ error: "Unable to process enrollment. Please try again later." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send notification to admin
    const adminEmailResponse = await resend.emails.send({
      from: `Enrollments <${fromEmail}>`,
      to: adminEmail.split(',').map(e => e.trim()), // Support multiple admin emails
      subject: "New Enrollment Submission",
      html: `
        <h1>New Enrollment Submission</h1>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Grade:</strong> ${safeGrade}</p>
        <p><strong>Phone:</strong> ${safePhone}</p>
        <p><strong>Interest Area:</strong> ${safeInterest}</p>
        <p><strong>Reason for Joining:</strong></p>
        <p>${safeReason}</p>
      `,
    });

    // Send confirmation to student
    const studentEmailResponse = await resend.emails.send({
      from: `Innovation Club <${fromEmail}>`,
      to: [email],
      subject: "Welcome to Innovation Club!",
      html: `
        <h1>Thank you for your enrollment, ${safeName}!</h1>
        <p>We have received your application and are excited about your interest in <strong>${safeInterest}</strong>.</p>
        <p>Our team will review your application and get back to you soon.</p>
        <p>Best regards,<br>The Innovation Club Team</p>
      `,
    });

    console.log("Emails sent successfully:", { adminEmailResponse, studentEmailResponse });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    // Log full error server-side only
    console.error("Error in send-enrollment-notification:", error);
    
    // Return generic error to client - never expose internal details
    return new Response(
      JSON.stringify({ error: "Failed to send notification" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(req.headers.get("origin")) },
      }
    );
  }
};

serve(handler);
