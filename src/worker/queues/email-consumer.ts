import type { MessageBatch } from "@cloudflare/workers-types";

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

const FROM_EMAIL = "noreply@dvpyic.dpdns.org";
const MAX_ATTEMPTS = 3;

/** Escape text before interpolating it into an HTML template (stored-XSS / HTML-injection guard). */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] as string),
  );
}

const toHtmlParagraph = (text: string) => escapeHtml(text).replace(/\r?\n/g, "<br>");

const wrap = (title: string, inner: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #333;">${escapeHtml(title)}</h2>
    ${inner}
  </div>
`;

/**
 * Build the HTML + tag for an outbound message. Every user-controlled value
 * (body, replyTo) is escaped – previously they were interpolated raw, so a
 * crafted contact message could inject markup/links into the admin's inbox.
 */
export function buildEmailContent(email: EmailMessage): { html: string; tag?: string } {
  switch (email.type) {
    case "contact":
      return {
        tag: "contact",
        html: wrap(
          "New Contact Message",
          `<p><strong>From:</strong> ${escapeHtml(email.replyTo || "Unknown")}</p>
           <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
           <p>${toHtmlParagraph(email.body)}</p>`,
        ),
      };
    case "contact_confirmation":
      return {
        tag: "contact-confirmation",
        html: wrap(
          "Thank You for Contacting YICDVP",
          `<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
           <p>${toHtmlParagraph(email.body)}</p>`,
        ),
      };
    case "enrollment":
      return { tag: "enrollment", html: wrap("Enrollment Notification", `<p>${toHtmlParagraph(email.body)}</p>`) };
    case "enrollment_update":
      return { tag: "enrollment-update", html: wrap("Enrollment Status Update", `<p>${toHtmlParagraph(email.body)}</p>`) };
    default:
      return { html: email.html ?? `<p>${toHtmlParagraph(email.body)}</p>` };
  }
}

export interface SendResult {
  success: boolean;
  error?: string;
  messageId?: string;
  /** true when retrying could help (network error / 429 / 5xx) */
  retryable?: boolean;
}

async function sendEmailViaLettermint(
  env: { LETTERMINT_API_KEY?: string },
  params: {
    from: string;
    to: string;
    subject: string;
    text?: string;
    html?: string;
    tag?: string;
    replyTo?: string;
    idempotencyKey?: string;
  },
): Promise<SendResult> {
  if (!env.LETTERMINT_API_KEY) {
    return { success: false, error: "LETTERMINT_API_KEY not configured", retryable: false };
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
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
        // The admin must be able to reply straight to the visitor. The old
        // direct-send path dropped replyTo entirely.
        ...(params.replyTo ? { reply_to: [params.replyTo] } : {}),
      }),
      signal: AbortSignal.timeout(10000),
    });

    // The provider can answer with an empty / non-JSON body (e.g. a 502 page);
    // an unguarded response.json() turned that into a misleading "Unexpected token".
    const data = (await response.json().catch(() => ({}))) as { message_id?: string; error?: string };

    if (!response.ok || data.error) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
        retryable: response.status === 429 || response.status >= 500,
      };
    }
    return { success: true, messageId: data.message_id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error", retryable: true };
  }
}

/** Build + send one message. Shared by the queue consumer and the Worker's direct-send fallback. */
export async function deliverEmail(
  env: { LETTERMINT_API_KEY?: string },
  email: EmailMessage,
): Promise<SendResult> {
  const { html, tag } = buildEmailContent(email);
  return sendEmailViaLettermint(env, {
    from: `YICDVP <${FROM_EMAIL}>`,
    to: email.to,
    subject: email.subject,
    text: email.body,
    html,
    tag,
    replyTo: email.replyTo,
    idempotencyKey: email.idempotencyKey || crypto.randomUUID(),
  });
}

/**
 * Queue consumer. Each message is acked/retried INDIVIDUALLY.
 *
 * The previous version threw from inside the loop, which (a) aborted the rest
 * of the batch and (b) made the runtime re-deliver the WHOLE batch, so mails
 * that had already been sent were sent again. It also retried permanent
 * failures (bad API key, invalid address) until the attempt cap.
 */
export async function processEmailQueue(
  batch: MessageBatch<EmailMessage>,
  env: { LETTERMINT_API_KEY?: string },
): Promise<void> {
  for (const message of batch.messages) {
    try {
      const result = await deliverEmail(env, message.body);

      if (result.success) {
        console.log(JSON.stringify({ level: "info", message: "[email-queue] Email sent", subject: message.body.subject, id: result.messageId }));
        message.ack();
        continue;
      }

      const retryable = result.retryable !== false && message.attempts < MAX_ATTEMPTS;
      console.error(JSON.stringify({
        level: "error",
        message: retryable ? "[email-queue] send failed, will retry" : "[email-queue] send failed permanently (dead-letter)",
        attempts: message.attempts,
        error: result.error,
        type: message.body.type,
        subject: message.body.subject,
      }));

      if (retryable) {
        // Exponential backoff: 30s, 60s, 120s…
        message.retry({ delaySeconds: 30 * 2 ** (message.attempts - 1) });
      } else {
        message.ack();
      }
    } catch (err) {
      console.error(JSON.stringify({ level: "error", message: "[email-queue] unexpected error", error: err instanceof Error ? err.message : String(err) }));
      if (message.attempts < MAX_ATTEMPTS) message.retry({ delaySeconds: 60 });
      else message.ack();
    }
  }
}
