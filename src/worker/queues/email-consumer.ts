/**
 * Email Queue Consumer
 * Processes email messages from the email-queue asynchronously.
 * Uses Lettermint REST API for email delivery.
 * API docs: https://lettermint.co/docs/quickstart
 */

import type { MessageBatch, Queue } from "@cloudflare/workers-types";

export interface EmailMessage {
  type: "contact" | "enrollment" | "enrollment_update" | "contact_confirmation";
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

      console.log(JSON.stringify({ level: "info", message: "[email-queue] Email sent successfully", subject: email.subject, to: email.to, id: result.messageId }));
    } catch (err) {
      console.error(JSON.stringify({ level: "error", message: "[email-queue] Failed to process message", error: err instanceof Error ? err.message : String(err) }));

      // Retry logic: throw to trigger automatic retry
      if (message.attempts < 3) {
        throw err;
      }

      // After max retries, log to dead-letter queue
      console.error(JSON.stringify({ level: "error", message: `[email-queue] Message failed after ${message.attempts} attempts. Dead-letter`, body: message.body }));
    }
  }
}
