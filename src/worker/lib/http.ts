import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { PROD_ORIGINS } from "./types";

export function safeWaitUntil(c: Context, promise: Promise<unknown>): Promise<void> | undefined {
  try {
    const ctx = c.executionCtx;
    if (ctx && typeof ctx.waitUntil === "function") {
      ctx.waitUntil(promise);
      return undefined;
    }
  } catch {
    // ExecutionContext absent (e.g. direct Hono.request() test)
  }
  return promise.then(() => undefined);
}

export class HttpError extends Error {
  constructor(readonly status: ContentfulStatusCode, message: string) {
    super(message);
  }
}

const DEFAULT_MAX_JSON_BYTES = 65_536;

export async function readJsonObject(
  c: Context,
  maxBytes = DEFAULT_MAX_JSON_BYTES
): Promise<Record<string, unknown>> {
  const contentLength = Number(c.req.header("Content-Length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new HttpError(413, "Payload too large");
  }

  let rawText: string;
  try {
    rawText = await c.req.text();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }

  if (new TextEncoder().encode(rawText).byteLength > maxBytes) {
    throw new HttpError(413, "Payload too large");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new HttpError(400, "Request body must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

export const sanitizeError = (error: unknown): string => {
  console.error(
    JSON.stringify({
      level: "error",
      message: "[INTERNAL ERROR]",
      error: error instanceof Error ? error.message : String(error),
    })
  );
  return "An internal error occurred. Please try again later.";
};

export function handleRouteError(c: Context, error: unknown) {
  if (error instanceof HttpError) {
    return c.json({ error: error.message }, error.status);
  }
  return c.json({ error: sanitizeError(error) }, 500);
}

export const isAllowedOrigin = (origin: string, env?: { NODE_ENV?: string }): boolean => {
  if (PROD_ORIGINS.includes(origin)) return true;
  if (/^https:\/\/([a-z0-9-]+\.)?yicdvp\.pages\.dev$/.test(origin)) return true;
  if (env?.NODE_ENV === "production") return false;
  return /^http:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]):\d+$/.test(origin);
};

export const getClientIP = (c: Context): string =>
  c.req.header("CF-Connecting-IP") ||
  c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ||
  "unknown";

export function requireString(
  body: Record<string, unknown>,
  field: string,
  max: number,
  required = true
): string {
  const raw = body[field];
  if (raw === undefined || raw === null || raw === "") {
    if (required) throw new HttpError(400, `Missing required field: ${field}`);
    return "";
  }
  if (typeof raw !== "string") throw new HttpError(400, `Field '${field}' must be a string`);
  const value = raw.trim();
  if (required && !value) throw new HttpError(400, `Missing required field: ${field}`);
  if (value.length > max) throw new HttpError(400, `Field '${field}' must be at most ${max} characters`);
  return value;
}
