import { Hono } from "hono";
import { APP_NAME, BUILD_VERSION, type AppEnv } from "../lib/types";
import { resolveSupabaseUrl } from "../lib/supabase";
import { cacheResponse, getCachedResponse } from "../lib/cache";

const healthRoutes = new Hono<AppEnv>();

healthRoutes.get("/api/health", async (c) => {
  c.header("Cache-Control", "no-store");
  const body: Record<string, unknown> = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: BUILD_VERSION,
    environment: c.env.NODE_ENV || "production",
    uptime: "edge",
  };

  if (c.req.query("deep") === "1") {
    try {
      const url = resolveSupabaseUrl(c.env);
      const key = c.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
      if (!url || !key) throw new Error("Supabase env not configured");
      const res = await fetch(`${url}/auth/v1/health`, {
        headers: { apikey: key },
        signal: AbortSignal.timeout(4000),
      });
      body.supabase = res.ok ? "ok" : `http_${res.status}`;
      if (!res.ok) body.status = "degraded";
    } catch (err) {
      body.supabase = "unreachable";
      body.status = "degraded";
      console.error(
        JSON.stringify({
          level: "error",
          message: "[health] supabase check failed",
          error: err instanceof Error ? err.message : String(err),
        })
      );
    }
  }

  return c.json(body, body.status === "healthy" ? 200 : 503);
});

healthRoutes.get("/api/info", async (c) => {
  const cached = await getCachedResponse(c.req.raw);
  if (cached) {
    c.header("X-Cache", "HIT");
    return cached;
  }

  const response = c.json({
    name: APP_NAME,
    version: BUILD_VERSION,
    platform: "Cloudflare Workers",
    features: [
      "Edge-deployed API",
      "Supabase integration",
      "Static asset serving",
      "Security headers",
      "CORS support",
      "KV rate limiting",
      "D1 edge caching",
      "Analytics Engine",
      "Queue processing",
      "Turnstile protection",
    ],
  });

  c.header("Cache-Control", "public, max-age=3600, s-maxage=3600");
  await cacheResponse(c.req.raw, response, 3600);
  c.header("X-Cache", "MISS");
  return response;
});

healthRoutes.get("/api/build-version", async (c) => {
  c.header("Cache-Control", "no-store, no-cache, must-revalidate");
  c.header("Pragma", "no-cache");
  return c.json({
    version: BUILD_VERSION,
    deployedAt: new Date().toISOString(),
  });
});

export default healthRoutes;
