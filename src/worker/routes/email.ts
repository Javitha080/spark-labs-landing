import { Hono } from "hono";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deliverEmail, type EmailMessage } from "../queues/email-consumer";
import {
  logEmailEvent,
  recordEmailEvent,
  verifyLettermintSignature,
  type LettermintWebhookPayload,
} from "../webhooks/lettermint";
import { authMiddleware, requirePermission } from "../middleware/auth";
import {
  HttpError,
  getClientIP,
  handleRouteError,
  isAllowedOrigin,
  readJsonObject,
  requireString,
} from "../lib/http";
import { isValidEmail, sanitizeObject, singleLine } from "../lib/sanitize";
import { getPublicSupabase, getSupabase } from "../lib/supabase";
import { verifyTurnstile } from "../lib/turnstile";
import { ADMIN_INBOX, CANONICAL_HOST, type AppEnv, type Env } from "../lib/types";

const emailRoutes = new Hono<AppEnv>();

async function sendOrQueue(env: Env, message: EmailMessage): Promise<void> {
  if (env.EMAIL_QUEUE && env.NODE_ENV === "production") {
    await env.EMAIL_QUEUE.send(message);
    return;
  }
  if (!env.LETTERMINT_API_KEY) {
    throw new HttpError(503, "Email service not configured");
  }
  const result = await deliverEmail(env, message);
  if (!result.success) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "[email] direct send failed",
        type: message.type,
        error: result.error,
      })
    );
    throw new HttpError(502, "Email delivery failed. Please try again later.");
  }
}

emailRoutes.post("/api/verify-turnstile", async (c) => {
  try {
    const origin = c.req.header("Origin") || "";
    if (!origin || !isAllowedOrigin(origin, c.env)) {
      return c.json({ error: "Turnstile verification requests are only accepted from dvpyic.dpdns.org." }, 403);
    }
    const body = await readJsonObject(c);
    const token = typeof body.token === "string" ? body.token : null;
    if (!token) return c.json({ error: "Missing 'token'" }, 400);
    const verified = await verifyTurnstile(token, c.env, getClientIP(c));
    return c.json({ success: verified });
  } catch (error) {
    return handleRouteError(c, error);
  }
});

emailRoutes.post("/api/send-contact-message", async (c) => {
  try {
    const origin = c.req.header("Origin") || "";
    if (!origin || !isAllowedOrigin(origin, c.env)) {
      return c.json({ error: "Contact messages are only accepted from dvpyic.dpdns.org." }, 403);
    }
    const body = sanitizeObject(await readJsonObject(c)) as Record<string, unknown>;
    const name = singleLine(requireString(body, "name", 100), 100);
    const email = requireString(body, "email", 254).toLowerCase();
    const message = requireString(body, "message", 5000);
    if (!name) return c.json({ error: "Missing required field: name" }, 400);
    if (!isValidEmail(email)) return c.json({ error: "Invalid email address" }, 400);

    const turnstileToken = c.req.header("X-Turnstile-Token");
    if (!turnstileToken) {
      return c.json({ error: "Security verification required. Please complete the challenge." }, 403);
    }
    if (!(await verifyTurnstile(turnstileToken, c.env, getClientIP(c)))) {
      return c.json({ error: "Security verification failed. Please try again." }, 403);
    }

    const idempotencyKey = crypto.randomUUID();

    await sendOrQueue(c.env, {
      type: "contact",
      to: ADMIN_INBOX,
      subject: `Contact Message from ${name}`,
      body: message,
      replyTo: email,
      idempotencyKey,
    });

    try {
      await sendOrQueue(c.env, {
        type: "contact_confirmation",
        to: email,
        subject: "Thank you for contacting YICDVP",
        body: `Dear ${name},\n\nThank you for reaching out to us. We have received your message and will get back to you as soon as possible.\n\nBest regards,\nYICDVP Team`,
        idempotencyKey: `${idempotencyKey}-confirm`,
      });
    } catch (confirmErr) {
      console.warn(
        JSON.stringify({
          level: "warn",
          message: "[send-contact-message] confirmation email failed",
          error: confirmErr instanceof Error ? confirmErr.message : String(confirmErr),
        })
      );
    }

    return c.json({ success: true, message: "Message sent successfully" });
  } catch (error: unknown) {
    return handleRouteError(c, error);
  }
});

emailRoutes.post("/api/lettermint/webhook", async (c) => {
  try {
    const secret = c.env.LETTERMINT_WEBHOOK_SECRET;
    if (!secret) {
      console.error(
        JSON.stringify({
          level: "error",
          message: "[lettermint] webhook secret not configured - can't verify deliveries",
        })
      );
      return c.json({ error: "Webhook is not configured" }, 503);
    }

    const rawBody = await c.req.text();
    const verification = await verifyLettermintSignature(
      rawBody,
      c.req.header("X-Lettermint-Signature"),
      c.req.header("X-Lettermint-Delivery"),
      secret
    );
    if (!verification.ok) {
      console.warn(
        JSON.stringify({
          level: "warn",
          message: "[lettermint] webhook signature rejected",
          reason: verification.reason,
        })
      );
      return c.json({ error: "Invalid signature" }, 401);
    }

    let payload: LettermintWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as LettermintWebhookPayload;
    } catch {
      return c.json({ error: "Invalid payload" }, 400);
    }
    if (!payload || typeof payload !== "object" || typeof payload.event !== "string" || typeof payload.id !== "string") {
      return c.json({ error: "Invalid payload" }, 400);
    }

    logEmailEvent(payload);
    recordEmailEvent(c.env, payload);
    return c.json({ ok: true });
  } catch (error: unknown) {
    return handleRouteError(c, error);
  }
});

emailRoutes.post("/api/newsletter-subscribe", async (c) => {
  try {
    const origin = c.req.header("Origin") || "";
    if (!origin || !isAllowedOrigin(origin, c.env)) {
      return c.json({ error: "Subscriptions are only accepted from dvpyic.dpdns.org." }, 403);
    }

    const body = sanitizeObject(await readJsonObject(c)) as Record<string, unknown>;
    const email = requireString(body, "email", 254).toLowerCase();
    if (!isValidEmail(email)) return c.json({ error: "Invalid email address" }, 400);

    const turnstileToken = c.req.header("X-Turnstile-Token");
    if (!turnstileToken) {
      return c.json({ error: "Please complete the security check and try again." }, 403);
    }
    if (!(await verifyTurnstile(turnstileToken, c.env, getClientIP(c)))) {
      return c.json({ error: "Security verification failed. Please try again." }, 403);
    }

    let stored = false;
    try {
      const supabase = getPublicSupabase(c.env);
      const { data, error } = await supabase.rpc("insert_newsletter_subscriber", {
        p_email: email,
        p_source: "footer",
      });
      if (error) throw error;
      stored = data === true;
    } catch (dbErr) {
      console.error(
        JSON.stringify({
          level: "error",
          message: "[newsletter-subscribe] subscriber upsert failed - falling back to email-only record",
          error: dbErr instanceof Error ? dbErr.message : String(dbErr),
        })
      );
    }

    await sendOrQueue(c.env, {
      type: "contact",
      to: ADMIN_INBOX,
      subject: "Newsletter subscription request",
      body: `Please add ${email} to the newsletter list.`,
      replyTo: email,
      idempotencyKey: crypto.randomUUID(),
    });
    return c.json({ success: true, message: "Subscribed", stored });
  } catch (error: unknown) {
    return handleRouteError(c, error);
  }
});

emailRoutes.post("/api/send-enrollment-notification", authMiddleware, requirePermission("enrollments"), async (c) => {
  try {
    const body = sanitizeObject(await readJsonObject(c)) as Record<string, unknown>;
    const name = singleLine(requireString(body, "name", 100, false), 100);
    const email = requireString(body, "email", 254).toLowerCase();
    const message = requireString(body, "message", 5000);
    if (!isValidEmail(email)) return c.json({ error: "Invalid email address" }, 400);

    await sendOrQueue(c.env, {
      type: "enrollment",
      to: email,
      subject: name ? `Enrollment Confirmation - ${name}` : "Enrollment Confirmation",
      body: message,
      idempotencyKey: crypto.randomUUID(),
    });
    return c.json({ success: true, message: "Notification sent" });
  } catch (error: unknown) {
    return handleRouteError(c, error);
  }
});

emailRoutes.post("/api/send-enrollment-update", authMiddleware, requirePermission("enrollments"), async (c) => {
  try {
    const body = sanitizeObject(await readJsonObject(c)) as Record<string, unknown>;
    const name = singleLine(requireString(body, "name", 100, false), 100);
    const email = requireString(body, "email", 254).toLowerCase();
    const message = requireString(body, "message", 5000);
    const subject = singleLine(requireString(body, "subject", 200, false), 200);
    if (!isValidEmail(email)) return c.json({ error: "Invalid email address" }, 400);

    await sendOrQueue(c.env, {
      type: "enrollment_update",
      to: email,
      subject: subject || (name ? `Enrollment Update - ${name}` : "Enrollment Status Update"),
      body: message,
      idempotencyKey: crypto.randomUUID(),
    });
    return c.json({ success: true, message: "Update notification sent" });
  } catch (error: unknown) {
    return handleRouteError(c, error);
  }
});

const NOTIFY_EMAIL_BATCH = 100;
const NOTIFY_SUBJECT_MAX = 150;

function buildNotificationEmailBody(row: {
  body: string | null;
  link: string | null;
  course_title: string | null;
}): string {
  const safeLink =
    row.link && row.link.startsWith("/") && !row.link.startsWith("//")
      ? singleLine(row.link, 200)
      : "";
  const parts = [
    row.course_title ? `Course: ${row.course_title}` : "",
    row.body || "",
    safeLink ? `Open: https://${CANONICAL_HOST}${safeLink}` : "",
  ].filter(Boolean);
  return parts.join("\n\n");
}

async function sendPendingNotificationEmails(
  env: Env,
  supabase: SupabaseClient
): Promise<{ found: number; sent: number; skipped: number }> {
  const { data, error } = await supabase
    .from("learning_notifications")
    .select("id, type, title, body, link, user_id, course:learning_courses(title), user:profiles!inner(email)")
    .eq("email_status", "pending")
    .order("created_at", { ascending: true })
    .limit(NOTIFY_EMAIL_BATCH);
  if (error) {
    throw new Error(`fetch failed: ${error.message}`);
  }
  const rows = (data ?? []) as unknown as {
    id: string;
    type: string;
    title: string | null;
    body: string | null;
    link: string | null;
    user_id: string;
    course: { title: string | null }[] | null;
    user: { email: string | null }[] | null;
  }[];
  if (rows.length === 0) return { found: 0, sent: 0, skipped: 0 };

  const optedOut = new Set<string>();
  try {
    const { data: prefs, error: prefsErr } = await supabase
      .from("student_accounts")
      .select("auth_user_id, email_notifications")
      .in("auth_user_id", [...new Set(rows.map((row) => row.user_id))])
      .eq("email_notifications", false);
    if (prefsErr) {
      console.warn(
        JSON.stringify({
          level: "warn",
          message: "[notify-emails] opt-in lookup failed, failing open",
          error: prefsErr.message,
        })
      );
    } else {
      for (const pref of prefs ?? []) {
        optedOut.add((pref as { auth_user_id: string }).auth_user_id);
      }
    }
  } catch (prefsExc) {
    console.warn(
      JSON.stringify({
        level: "warn",
        message: "[notify-emails] opt-in lookup threw, failing open",
        error: prefsExc instanceof Error ? prefsExc.message : String(prefsExc),
      })
    );
  }

  const sentIds: string[] = [];
  const skipIds: string[] = [];
  // react-doctor-disable async-await-in-loop
  for (const row of rows) {
    if (optedOut.has(row.user_id)) {
      skipIds.push(row.id);
      continue;
    }
    const email = row.user?.[0]?.email || "";
    if (!email || !isValidEmail(email)) {
      skipIds.push(row.id);
      continue;
    }
    try {
      await sendOrQueue(env, {
        type: "learning_notification",
        to: email,
        subject: singleLine(row.title || "New activity in your Learning Hub", NOTIFY_SUBJECT_MAX) || "New activity in your Learning Hub",
        body: buildNotificationEmailBody({
          body: row.body,
          link: row.link,
          course_title: row.course?.[0]?.title ?? null,
        }),
        idempotencyKey: `learnmail:${row.id}`,
      });
      sentIds.push(row.id);
    } catch (err) {
      console.warn(
        JSON.stringify({
          level: "warn",
          message: "[notify-emails] send failed",
          id: row.id,
          error: err instanceof Error ? err.message : String(err),
        })
      );
    }
  }

  if (sentIds.length) {
    const { error: sentErr } = await supabase
      .from("learning_notifications")
      .update({ email_status: "sent" })
      .in("id", sentIds);
    if (sentErr) {
      console.warn(JSON.stringify({ level: "warn", message: "[notify-emails] mark sent failed", error: sentErr.message }));
    }
  }
  if (skipIds.length) {
    const { error: skipErr } = await supabase
      .from("learning_notifications")
      .update({ email_status: "skipped" })
      .in("id", skipIds);
    if (skipErr) {
      console.warn(JSON.stringify({ level: "warn", message: "[notify-emails] mark skipped failed", error: skipErr.message }));
    }
  }
  return { found: rows.length, sent: sentIds.length, skipped: skipIds.length };
}

export async function processLearningNotificationEmails(env: Env): Promise<void> {
  try {
    const supabase = getSupabase(env);
    await sendPendingNotificationEmails(env, supabase);
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "[notify-emails] processing failed",
        error: err instanceof Error ? err.message : String(err),
      })
    );
  }
}

emailRoutes.post("/api/notify-emails/tick", authMiddleware, requirePermission("learning_hub"), async (c) => {
  try {
    const supabase = c.get("supabase");
    const summary = await sendPendingNotificationEmails(c.env, supabase);
    return c.json({ success: true, found: summary.found, sent: summary.sent, skipped: summary.skipped });
  } catch (error: unknown) {
    return handleRouteError(c, error);
  }
});

export default emailRoutes;
