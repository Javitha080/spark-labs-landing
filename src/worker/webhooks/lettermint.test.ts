import { afterEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import {
  logEmailEvent,
  recordEmailEvent,
  verifyLettermintSignature,
  type LettermintWebhookPayload,
} from "./lettermint";

const SECRET = "whsec_test_secret";
const BODY = JSON.stringify({
  id: "54d7e8c9-1195-4ba0-9d3f-b9af92305add",
  event: "message.hard_bounced",
  timestamp: new Date().toISOString(),
  data: { recipient: "admin@dvpyic.dpdns.org", reason: "Upstream error" },
});

/** Build a header pair exactly the way Lettermint signs deliveries. */
function sign(rawBody: string, timestamp: number, secret = SECRET) {
  const hmac = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return {
    signatureHeader: `t=${timestamp},v1=${hmac}`,
    deliveryHeader: String(timestamp),
  };
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("verifyLettermintSignature", () => {
  it("accepts a fresh, correctly-signed delivery", async () => {
    const { signatureHeader, deliveryHeader } = sign(BODY, nowSeconds());

    const result = await verifyLettermintSignature(BODY, signatureHeader, deliveryHeader, SECRET);

    expect(result.ok).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("accepts ArrayBuffer and Uint8Array bodies byte-for-byte", async () => {
    const { signatureHeader, deliveryHeader } = sign(BODY, nowSeconds());

    const asBytes = await verifyLettermintSignature(
      new TextEncoder().encode(BODY),
      signatureHeader,
      deliveryHeader,
      SECRET,
    );
    const asBuffer = await verifyLettermintSignature(
      new TextEncoder().encode(BODY).buffer,
      signatureHeader,
      deliveryHeader,
      SECRET,
    );

    expect(asBytes.ok).toBe(true);
    expect(asBuffer.ok).toBe(true);
  });

  it("rejects tampered bodies", async () => {
    const { signatureHeader, deliveryHeader } = sign(BODY, nowSeconds());
    const tampered = BODY.replace("Upstream error", "Tampered error");

    const result = await verifyLettermintSignature(tampered, signatureHeader, deliveryHeader, SECRET);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("signature_mismatch");
  });

  it("rejects a wrong secret", async () => {
    const { signatureHeader, deliveryHeader } = sign(BODY, nowSeconds(), "whsec_other");

    const result = await verifyLettermintSignature(BODY, signatureHeader, deliveryHeader, SECRET);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("signature_mismatch");
  });

  it("rejects when the delivery timestamp does not match the signed timestamp", async () => {
    const now = nowSeconds();
    const { signatureHeader } = sign(BODY, now);

    const result = await verifyLettermintSignature(BODY, signatureHeader, String(now - 5), SECRET);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("delivery_timestamp_mismatch");
  });

  it("rejects stale and future-dated signatures (replay protection)", async () => {
    const stale = nowSeconds() - 301;
    const future = nowSeconds() + 301;
    const staleHeaders = sign(BODY, stale);
    const futureHeaders = sign(BODY, future);

    const staleResult = await verifyLettermintSignature(BODY, staleHeaders.signatureHeader, staleHeaders.deliveryHeader, SECRET);
    const futureResult = await verifyLettermintSignature(BODY, futureHeaders.signatureHeader, futureHeaders.deliveryHeader, SECRET);

    expect(staleResult.reason).toBe("timestamp_out_of_tolerance");
    expect(futureResult.reason).toBe("timestamp_out_of_tolerance");
  });

  it("reports missing or malformed headers distinctly", async () => {
    const missing = await verifyLettermintSignature(BODY, undefined, undefined, SECRET);
    const malformed = await verifyLettermintSignature(
      BODY,
      "t=abc,v1=zzz",
      String(nowSeconds()),
      SECRET,
    );

    expect(missing.reason).toBe("signature_header_missing");
    expect(malformed.reason).toBe("signature_header_malformed");
  });
});

describe("recordEmailEvent", () => {
  it("writes one bounce-free-of-PII datapoint and never throws", () => {
    const payload: LettermintWebhookPayload = {
      id: "evt-1",
      event: "message.hard_bounced",
      timestamp: new Date().toISOString(),
      data: { recipient: "admin@dvpyic.dpdns.org", response: { status_code: 521, enhanced_status_code: "5.3.0" } },
    };
    const writeDataPoint = vi.fn();
    const brokenWriter = { writeDataPoint: null as unknown };

    recordEmailEvent({ ANALYTICS: { writeDataPoint } }, payload);
    // A malformed binding must not break the webhook acknowledgment.
    recordEmailEvent({ ANALYTICS: brokenWriter }, payload);
    recordEmailEvent({}, payload);

    expect(writeDataPoint).toHaveBeenCalledTimes(1);
    const blobs = writeDataPoint.mock.calls[0]?.[0]?.blobs as string[];
    expect(blobs[0]).toBe("email_event");
    expect(blobs[1]).toBe("message.hard_bounced");
    expect(blobs[4]).toBe("5.3.0");
    expect(blobs.join(" ")).not.toContain("admin@");
  });
});

describe("logEmailEvent", () => {
  it("routes failing events to console.error with the provider response", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    logEmailEvent({
      id: "evt-2",
      event: "message.hard_bounced",
      timestamp: new Date().toISOString(),
      data: { recipient: "admin@dvpyic.dpdns.org", response: { status_code: 521, content: "Upstream error" } },
    });
    logEmailEvent({ id: "evt-3", event: "message.delivered", timestamp: new Date().toISOString(), data: { recipient: "x@y.com" } });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(errorSpy.mock.calls[0]?.[0] as string) as Record<string, unknown>;
    expect(entry.event).toBe("message.hard_bounced");
    expect(entry.recipient).toBe("admin@dvpyic.dpdns.org");
    expect(entry.error).toBe("Upstream error");
    expect(logSpy).toHaveBeenCalledTimes(1);
  });
});
