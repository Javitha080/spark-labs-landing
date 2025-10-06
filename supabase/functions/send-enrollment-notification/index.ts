import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EnrollmentRequest {
  name: string;
  email: string;
  grade: string;
  phone: string;
  interest: string;
  reason: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, grade, phone, interest, reason }: EnrollmentRequest = await req.json();

    console.log("Processing enrollment for:", name);

    // Send notification to admin
    const adminEmailResponse = await resend.emails.send({
      from: "Enrollments <onboarding@resend.dev>",
      to: ["admin@example.com"], // Replace with actual admin email
      subject: "New Enrollment Submission",
      html: `
        <h1>New Enrollment Submission</h1>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Grade:</strong> ${grade}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Interest Area:</strong> ${interest}</p>
        <p><strong>Reason for Joining:</strong></p>
        <p>${reason}</p>
      `,
    });

    // Send confirmation to student
    const studentEmailResponse = await resend.emails.send({
      from: "Innovation Club <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to Innovation Club!",
      html: `
        <h1>Thank you for your enrollment, ${name}!</h1>
        <p>We have received your application and are excited about your interest in <strong>${interest}</strong>.</p>
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
    console.error("Error in send-enrollment-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
