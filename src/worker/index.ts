import { Hono } from "hono";
import { cors } from "hono/cors";
import { etag } from "hono/etag";
import type { ExecutionContext, MessageBatch } from "@cloudflare/workers-types";
import { buildCSPPolicy } from "../lib/cspPolicy";
import { analyticsMiddleware } from "./middleware/analytics";
import { processEmailQueue, type EmailMessage } from "./queues/email-consumer";
import { HttpError, isAllowedOrigin } from "./lib/http";
import { rateLimitMiddleware } from "./lib/rate-limit";
import { CANONICAL_HOST, PROD_ORIGINS, type AppEnv, type Env } from "./lib/types";
import healthRoutes from "./routes/health";
import sitemapRoutes from "./routes/sitemaps";
import rssRoutes from "./routes/rss";
import publicApiRoutes from "./routes/public-api";
import scheduleRoutes from "./routes/schedule";
import enrollRoutes from "./routes/enroll";
import emailRoutes, { processLearningNotificationEmails } from "./routes/email";
import uploadRoutes from "./routes/upload";
import telemetryRoutes from "./routes/telemetry";
import seoAssetsRoutes from "./routes/seo-assets";

const CSP_POLICY = buildCSPPolicy();

const app = new Hono<AppEnv>();

// ─── Global Middleware ──────────────────────────────────────────────────────
app.use("*", analyticsMiddleware);

app.use("*", async (c, next) => {
  const url = new URL(c.req.url);
  const host = url.hostname;

  const isPreviewEnv =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.startsWith("192.168.") ||
    host.startsWith("10.") ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
    host.endsWith(".lovable.app") ||
    host.endsWith(".pages.dev") ||
    host.endsWith(".workers.dev");

  if (!isPreviewEnv) {
    if (url.protocol === "http:") {
      url.protocol = "https:";
      url.hostname = CANONICAL_HOST;
      url.port = "";
      return c.redirect(url.toString(), 301);
    }
    if (host !== CANONICAL_HOST) {
      url.hostname = CANONICAL_HOST;
      url.port = "";
      return c.redirect(url.toString(), 301);
    }
  }

  await next();
});

// NOTE: hono/compress intentionally omitted (Cloudflare compresses at the edge).
app.use("/api/*", etag());

app.use(
  "/api/*",
  cors({
    origin: (origin, c) => (origin && isAllowedOrigin(origin, c.env) ? origin : PROD_ORIGINS[0]),
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Turnstile-Token", "X-Correlation-Id"],
    exposeHeaders: ["X-Request-Id", "Retry-After", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
    maxAge: 86400,
    credentials: true,
  })
);

app.use("/api/*", rateLimitMiddleware);

app.use("/api/*", async (c, next) => {
  await next();

  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "SAMEORIGIN");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), xr-spatial-tracking=()"
  );
  c.header("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  c.header("Content-Security-Policy", CSP_POLICY);
  c.header("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  c.header("Cross-Origin-Resource-Policy", "cross-origin");

  if (!c.res.headers.has("Cache-Control")) {
    c.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    c.header("Pragma", "no-cache");
  }

  c.header("X-Request-Id", crypto.randomUUID());
});

// ─── Route Composition ──────────────────────────────────────────────────────
app.route("/", healthRoutes);
app.route("/", sitemapRoutes);
app.route("/", rssRoutes);
app.route("/", publicApiRoutes);
app.route("/", scheduleRoutes);
app.route("/", enrollRoutes);
app.route("/", emailRoutes);
app.route("/", uploadRoutes);
app.route("/", telemetryRoutes);

// Unknown /api/* routes return JSON 404 instead of falling through to SPA HTML
app.all("/api/*", (c) => c.json({ error: "Not found", path: new URL(c.req.url).pathname }, 404));

app.onError((err, c) => {
  if (err instanceof HttpError) {
    return c.json({ error: err.message }, err.status);
  }
  console.error(
    JSON.stringify({
      level: "error",
      message: "[unhandled]",
      path: new URL(c.req.url).pathname,
      method: c.req.method,
      error: err instanceof Error ? err.message : String(err),
    })
  );
  return c.json({ error: "An internal error occurred. Please try again later." }, 500);
});

// SPA fallback, bot prerendering, and static asset headers (MUST be last)
app.route("/", seoAssetsRoutes);

// ─── Worker Entrypoint ──────────────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return await app.fetch(request, env, ctx);
  },
  queue: async (batch: MessageBatch<EmailMessage>, env: Env, _ctx: ExecutionContext): Promise<void> => {
    await processEmailQueue(batch, env);
  },
  scheduled: async (_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> => {
    ctx.waitUntil(processLearningNotificationEmails(env));
  },
};
