import { Hono } from "hono";
import { z } from "zod";
import { isAllowedOrigin } from "../lib/http";
import type { AppEnv, Env } from "../lib/types";

const telemetryRoutes = new Hono<AppEnv>();

const MAX_TELEMETRY_BYTES = 8_192;
const MAX_CSP_REPORT_BYTES = 16_384;

const vitalMetricSchema = z.object({
  LCP: z.number().finite().min(0).max(600_000).optional(),
  INP: z.number().finite().min(0).max(600_000).optional(),
  CLS: z.number().finite().min(0).max(100).optional(),
  FCP: z.number().finite().min(0).max(600_000).optional(),
  TTFB: z.number().finite().min(0).max(600_000).optional(),
});

const singleVitalSchema = z.object({
  kind: z.literal("vitals"),
  path: z.string().max(256),
  metrics: vitalMetricSchema,
  device: z.enum(["mobile", "desktop"]).optional(),
  connection: z.string().max(32).optional(),
});

const singleErrorSchema = z.object({
  kind: z.literal("error"),
  code: z.string().max(64).optional(),
  category: z.string().max(32).optional(),
  name: z.string().max(80).optional(),
  message: z.string().max(300),
  path: z.string().max(256).optional(),
  context: z.string().max(120).optional(),
});

const telemetryItemSchema = z.discriminatedUnion("kind", [singleVitalSchema, singleErrorSchema]);
const telemetryEnvelopeSchema = z.union([
  telemetryItemSchema,
  z.object({ events: z.array(telemetryItemSchema).min(1).max(10) }),
]);

type AnalyticsWriter = {
  writeDataPoint: (payload: {
    blobs: string[];
    doubles?: number[];
    indexes?: string[];
  }) => void;
};

function sanitizePath(raw?: string): string {
  if (!raw) return "/";
  const noQuery = raw.split("?")[0].split("#")[0];
  return sanitizeLogMessage(noQuery).slice(0, 128) || "/";
}

function sanitizeLogMessage(raw: string): string {
  return raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/Bearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "[jwt]")
    .replace(/\b(?:sb_publishable|sbp|lm)_[A-Za-z0-9._-]{8,}\b/gi, "[token]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .trim()
    .slice(0, 200);
}

function sanitizeOriginPath(raw?: string): string {
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    return sanitizeLogMessage(`${parsed.origin}${parsed.pathname}`).slice(0, 160);
  } catch {
    return sanitizeLogMessage(raw.split("?")[0].split("#")[0]).slice(0, 160);
  }
}

function writeTelemetryPoint(
  env: Env,
  blobs: string[],
  doubles?: number[],
  indexes?: string[]
) {
  try {
    const writer = env.ANALYTICS as AnalyticsWriter | undefined;
    if (writer && typeof writer.writeDataPoint === "function") {
      writer.writeDataPoint({
        blobs: blobs.map((b) => b.slice(0, 32)),
        ...(doubles ? { doubles } : {}),
        ...(indexes ? { indexes } : {}),
      });
    }
  } catch {
    // Telemetry must never break requests
  }
}

telemetryRoutes.post("/api/telemetry", async (c) => {
  const origin = c.req.header("Origin");
  if (origin && !isAllowedOrigin(origin, c.env)) {
    return c.json({ error: "Forbidden origin" }, 403);
  }

  const rawText = await c.req.text();
  if (new TextEncoder().encode(rawText).byteLength > MAX_TELEMETRY_BYTES) {
    return c.json({ error: "Payload too large" }, 413);
  }

  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch {
    return c.json({ error: "Invalid JSON payload" }, 400);
  }

  const parsed = telemetryEnvelopeSchema.safeParse(json);
  if (!parsed.success) {
    return c.json({ error: "Invalid telemetry schema" }, 400);
  }

  const items = "events" in parsed.data ? parsed.data.events : [parsed.data];

  for (const item of items) {
    if (item.kind === "vitals") {
      const cleanPath = sanitizePath(item.path);
      const { LCP = 0, INP = 0, CLS = 0, FCP = 0, TTFB = 0 } = item.metrics;
      writeTelemetryPoint(
        c.env,
        ["web_vitals", cleanPath, item.device || "unknown", item.connection || "unknown"],
        [LCP, INP, CLS, FCP, TTFB]
      );
    } else {
      const cleanPath = sanitizePath(item.path);
      const cleanCode = sanitizeLogMessage(item.code || "unknown").slice(0, 64) || "unknown";
      const cleanCategory = sanitizeLogMessage(item.category || "unknown").slice(0, 32) || "unknown";
      console.warn(
        JSON.stringify({
          level: "warn",
          message: "[client-error]",
          code: cleanCode,
          category: cleanCategory,
          path: cleanPath,
          context: sanitizeLogMessage(item.context || "").slice(0, 120),
          error: sanitizeLogMessage(item.message),
        })
      );
      writeTelemetryPoint(
        c.env,
        ["client_error", cleanCategory, cleanCode, cleanPath],
        [1]
      );
    }
  }

  return c.body(null, 204);
});

telemetryRoutes.post("/api/csp-report", async (c) => {
  const rawText = await c.req.text();
  if (new TextEncoder().encode(rawText).byteLength > MAX_CSP_REPORT_BYTES) {
    return c.json({ error: "Payload too large" }, 413);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return c.json({ error: "Invalid JSON payload" }, 400);
  }

  const reports: Array<{
    directive: string;
    blockedUri: string;
    documentUri: string;
  }> = [];

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const record = parsed as Record<string, unknown>;
    const legacy = (record["csp-report"] ?? record) as Record<string, unknown>;
    if (legacy && typeof legacy === "object") {
      reports.push({
        directive: sanitizeLogMessage(String(legacy["violated-directive"] || legacy["effective-directive"] || "unknown")).slice(0, 64) || "unknown",
        blockedUri: sanitizeOriginPath(typeof legacy["blocked-uri"] === "string" ? legacy["blocked-uri"] : ""),
        documentUri: sanitizeOriginPath(typeof legacy["document-uri"] === "string" ? legacy["document-uri"] : ""),
      });
    }
  } else if (Array.isArray(parsed)) {
    for (const entry of parsed.slice(0, 10)) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      const body = (e.body && typeof e.body === "object" ? e.body : e) as Record<string, unknown>;
      reports.push({
        directive: sanitizeLogMessage(String(body.effectiveDirective || body.violatedDirective || body["violated-directive"] || "unknown")).slice(0, 64) || "unknown",
        blockedUri: sanitizeOriginPath(String(body.blockedURL || body["blocked-uri"] || "")),
        documentUri: sanitizeOriginPath(String(body.documentURL || body["document-uri"] || "")),
      });
    }
  } else {
    return c.json({ error: "Invalid CSP report format" }, 400);
  }

  for (const r of reports) {
    console.warn(
      JSON.stringify({
        level: "warn",
        message: "[csp-violation]",
        directive: r.directive,
        blockedUri: r.blockedUri,
        documentUri: r.documentUri,
      })
    );
    writeTelemetryPoint(c.env, ["csp_violation", r.directive, r.blockedUri, r.documentUri], [1]);
  }

  return c.body(null, 204);
});

export default telemetryRoutes;
