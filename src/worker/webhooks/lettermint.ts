/**
 * Lettermint webhook events (bounces, complaints, suppressions, deliveries).
 *
 * Lettermint signs deliveries the Stripe/Svix way
 * (https://lettermint.co/docs/platform/webhooks/signing):
 *
 *   X-Lettermint-Signature: t=<unix-seconds>,v1=<hmac_hex>
 *   X-Lettermint-Delivery:  <unix-seconds>  (must equal t)
 *   signed_payload        = `{t}.{raw_body_bytes}`
 *
 * `v1` is HMAC-SHA256(signed_payload, whsec_...) hex. Anything older/newer
 * than 300 s is a replay attempt and must be rejected. The raw body must be
 * verified before any JSON parsing - Hono's c.req.json() re-serializes and
 * would break the byte-for-byte hash.
 */

export interface LettermintWebhookPayload {
  id: string;
  event: string;
  timestamp: string;
  sandbox?: boolean;
  context?: {
    scope?: string;
    team_id?: string;
    project_id?: string | null;
    route_id?: string | null;
  };
  data?: Record<string, unknown>;
}

export type SignatureFailureReason =
  | "signature_header_missing"
  | "delivery_header_missing"
  | "signature_header_malformed"
  | "delivery_timestamp_mismatch"
  | "timestamp_out_of_tolerance"
  | "signature_mismatch";

export interface SignatureCheck {
  ok: boolean;
  reason?: SignatureFailureReason;
  /** Signed timestamp (unix seconds) - defined whenever the header parsed. */
  timestamp?: number;
}

const REPLAY_TOLERANCE_SECONDS = 300;

/**
 * Timing-safe signature verification with Web Crypto (Workers runtime).
 * The final comparison hashes both candidate digests again so the loop runs
 * a fixed number of iterations regardless of which byte differed.
 */
export async function verifyLettermintSignature(
  rawBody: string | Uint8Array | ArrayBufferLike,
  signatureHeader: string | undefined,
  deliveryHeader: string | undefined,
  secret: string,
  toleranceSeconds = REPLAY_TOLERANCE_SECONDS,
): Promise<SignatureCheck> {
  if (!signatureHeader) return { ok: false, reason: "signature_header_missing" };
  if (!deliveryHeader) return { ok: false, reason: "delivery_header_missing" };

  const parts = new Map<string, string>();
  for (const element of signatureHeader.split(",")) {
    const eq = element.indexOf("=");
    if (eq > 0) parts.set(element.slice(0, eq).trim(), element.slice(eq + 1).trim());
  }
  const t = parts.get("t");
  const v1 = parts.get("v1");
  if (!t || !v1 || !/^\d+$/.test(t)) {
    return { ok: false, reason: "signature_header_malformed" };
  }

  const timestamp = Number(t);
  // The delivery header binds the signature to THIS delivery; a captured
  // header can't be replayed for a different payload/attempt.
  if (Number(deliveryHeader) !== timestamp) {
    return { ok: false, reason: "delivery_timestamp_mismatch", timestamp };
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    return { ok: false, reason: "timestamp_out_of_tolerance", timestamp };
  }

  const encoder = new TextEncoder();
  const bodyBytes =
    typeof rawBody === "string"
      ? encoder.encode(rawBody)
      : rawBody instanceof Uint8Array
        ? rawBody
        : new Uint8Array(rawBody);

  const header = encoder.encode(`${t}.`);
  const signedPayload = new Uint8Array(header.length + bodyBytes.length);
  signedPayload.set(header);
  signedPayload.set(bodyBytes, header.length);

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, signedPayload));
  let expected = "";
  for (const byte of digest) expected += byte.toString(16).padStart(2, "0");

  if (v1.length !== expected.length) return { ok: false, reason: "signature_mismatch", timestamp };
  const a = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(expected)));
  const b = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(v1)));
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0
    ? { ok: true, timestamp }
    : { ok: false, reason: "signature_mismatch", timestamp };
}

export interface AnalyticsWriter {
  writeDataPoint?: (payload: { blobs: string[]; doubles?: number[] }) => void;
}

/**
 * One Analytics Engine point per verified event. Blobs stay PII-free
 * (event type, provider reason, upgraded status code, sandbox flag) so the
 * yic_metrics dataset never accumulates addresses - the Worker logs carry
 * the actionable detail for the operator instead.
 */
export function recordEmailEvent(env: { ANALYTICS?: unknown }, payload: LettermintWebhookPayload): void {
  const analytics = env.ANALYTICS as AnalyticsWriter | undefined;
  if (!analytics || typeof analytics.writeDataPoint !== "function") return;

  try {
    const data = payload.data ?? {};
    const response = data.response as { status_code?: number; enhanced_status_code?: string } | undefined;
    analytics.writeDataPoint({
      blobs: [
        "email_event",
        payload.event,
        typeof data.reason === "string" ? data.reason : "",
        typeof data.reason_code === "string" ? data.reason_code : "",
        response?.enhanced_status_code ??
          (response?.status_code !== undefined ? String(response.status_code) : ""),
        payload.sandbox ? "sandbox" : "live",
      ],
      doubles: [],
    });
  } catch {
    // Telemetry must never break acknowledgment of a valid webhook.
  }
}

/**
 * Operator-facing log line. Deliveries log centrally; the failing events
 * carry the recipient and the provider's SMTP response, which is exactly
 * what made the Nov 2026 admin@ hard bounce (521 5.3.0 upstream) invisible
 * outside the Lettermint dashboard.
 */
export function logEmailEvent(payload: LettermintWebhookPayload): void {
  const data = payload.data ?? {};
  const response = data.response as { status_code?: number; enhanced_status_code?: string; content?: string } | undefined;
  const reason = typeof data.reason === "string" ? data.reason : "";
  const failing =
    reason ||
    response?.content ||
    (response?.enhanced_status_code ?? "") ||
    (response?.status_code !== undefined ? String(response.status_code) : "");

  const entry = {
    level:
      payload.event === "message.delivered"
        ? "info"
        : payload.event === "message.soft_bounced"
          ? "warn"
          : payload.event.startsWith("message.") && payload.event !== "message.created" && payload.event !== "message.opened" && payload.event !== "message.clicked"
            ? "error"
            : "info",
    message: "[lettermint] event",
    event: payload.event,
    id: payload.id,
    ...(typeof data.recipient === "string" ? { recipient: data.recipient } : {}),
    ...(typeof data.subject === "string" ? { subject: data.subject.slice(0, 150) } : {}),
    ...(failing ? { error: failing } : {}),
    ...(payload.context?.team_id ? { team: payload.context.team_id } : {}),
  };
  const line = JSON.stringify(entry);
  // The Worker esbuild drops console.* below warn in production builds, so
  // error-level events must not sit on console.log (audit §: "[email-queue]
  // console.log lines were previously dropped").
  if (entry.level === "error") console.error(line);
  else if (entry.level === "warn") console.warn(line);
  else console.log(line);
}
