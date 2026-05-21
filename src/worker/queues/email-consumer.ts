/**
 * Email Queue Consumer
 * Processes email messages from the email-queue asynchronously.
 * Uses Lettermint REST API for email delivery.
 * API docs: https://lettermint.co/docs/quickstart
 */

import type { MessageBatch, Queue } from "@cloudflare/workers-types";

export interface EmailMessage {
  type: "contact" | "enrollment" | "enrollment_update" | "contact_confirmation" | "student_welcome";
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
  html?: string;
  idempotencyKey?: string;
  metadata?: Record<string, string>;
}

/**
 * Send email via Lettermint REST API.
 * Endpoint: POST https://api.lettermint.co/v1/send
 * Auth: x-lettermint-token header
 */
async function sendEmailViaLettermint(
  env: { LETTERMINT_API_KEY?: string },
  params: {
    from: string;
    to: string;
    subject: string;
    text?: string;
    html?: string;
    tag?: string;
    idempotencyKey?: string;
  }
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  if (!env.LETTERMINT_API_KEY) {
    return { success: false, error: "LETTERMINT_API_KEY not configured" };
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "x-lettermint-token": env.LETTERMINT_API_KEY,
    };

    if (params.idempotencyKey) {
      headers["Idempotency-Key"] = params.idempotencyKey;
    }

    const response = await fetch("https://api.lettermint.co/v1/send", {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: params.from,
        to: [params.to],
        subject: params.subject,
        text: params.text,
        html: params.html,
        tag: params.tag,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json() as { message_id?: string; error?: string };

    if (!response.ok || data.error) {
      return { success: false, error: data.error || `HTTP ${response.status}` };
    }

    return { success: true, messageId: data.message_id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Process a batch of email messages from the queue.
 * Called automatically by Cloudflare Queues when messages are available.
 */
export async function processEmailQueue(
  batch: MessageBatch<EmailMessage>,
  env: { LETTERMINT_API_KEY?: string }
): Promise<void> {
  const fromEmail = "noreply@dvpyic.dpdns.org";

  for (const message of batch.messages) {
    try {
      const email = message.body;

      // Build email content based on type
      let htmlContent = email.html;
      const textContent = email.body;
      let tag: string | undefined;

      if (email.type === "contact") {
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Contact Message</h2>
            <p><strong>From:</strong> ${email.replyTo || "Unknown"}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p>${email.body.replace(/\n/g, "<br>")}</p>
          </div>
        `;
        tag = "contact";
      } else if (email.type === "contact_confirmation") {
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Thank You for Contacting YICDVP</h2>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p>${email.body.replace(/\n/g, "<br>")}</p>
            <p style="margin-top: 20px; color: #666;">We'll get back to you as soon as possible.</p>
          </div>
        `;
        tag = "contact-confirmation";
      } else if (email.type === "enrollment") {
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Enrollment</h2>
            <p>${email.body.replace(/\n/g, "<br>")}</p>
          </div>
        `;
        tag = "enrollment";
      } else if (email.type === "enrollment_update") {
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Enrollment Status Update</h2>
            <p>${email.body.replace(/\n/g, "<br>")}</p>
          </div>
        `;
        tag = "enrollment-update";
      } else if (email.type === "student_welcome") {
        htmlContent = `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0b; color: #e4e4e7; padding: 40px 30px; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #a78bfa; font-size: 28px; margin: 0;">Welcome to SPARK Labs! 🚀</h1>
            </div>
            <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${email.metadata?.name || 'Student'}</strong>,</p>
            <p style="line-height: 1.6;">Your Student Portal account has been created. Here are your login details:</p>
            <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>📧 Username:</strong> ${email.to}</p>
            </div>
            <div style="text-align: center; margin: 25px 0;">
              <a href="${email.metadata?.portalUrl || 'https://dvpyic.dpdns.org/student/login'}" style="background: linear-gradient(135deg, #a78bfa, #6366f1); color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">Set Your Password & Login →</a>
            </div>
            <div style="background: #1c1917; border-left: 3px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
              <p style="margin: 0; font-size: 13px; color: #fbbf24;">⚠️ <strong>Security Notice:</strong> You will be asked to set your password on first login. Never share your credentials with anyone.</p>
            </div>
            <p style="font-size: 13px; color: #71717a; margin-top: 30px;">— The YICDVP Team</p>
          </div>
        `;
        tag = "student-welcome";
      }

      // Generate idempotency key if not provided
      const idempotencyKey = email.idempotencyKey || crypto.randomUUID();

      // Send email via Lettermint
      const result = await sendEmailViaLettermint(env, {
        from: `YICDVP <${fromEmail}>`,
        to: email.to,
        subject: email.subject,
        text: textContent,
        html: htmlContent,
        tag,
        idempotencyKey,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      console.log(`[email-queue] Email sent successfully: ${email.subject} to ${email.to} (id: ${result.messageId})`);
    } catch (err) {
      console.error(`[email-queue] Failed to process message:`, err);

      // Retry logic: throw to trigger automatic retry
      if (message.attempts < 3) {
        throw err;
      }

      // After max retries, log to dead-letter queue
      console.error(
        `[email-queue] Message failed after ${message.attempts} attempts. Dead-letter:`,
        JSON.stringify(message.body)
      );
    }
  }
}
