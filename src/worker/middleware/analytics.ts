/**
 * Analytics Engine Middleware
 * Tracks page views, API requests, and bot vs human traffic at the edge.
 * Uses Cloudflare Analytics Engine for server-side, ad-blocker-resistant analytics.
 */

import type { Context, Next } from "hono";
import type { AnalyticsEngineDataset } from "@cloudflare/workers-types";

type Env = {
  ANALYTICS: AnalyticsEngineDataset;
};

/**
 * Analytics tracking middleware.
 * Captures request metadata and writes to Analytics Engine.
 */
export const analyticsMiddleware = async (c: Context<{ Bindings: Env }>, next: Next) => {
  const start = Date.now();

  await next();

  const duration = Date.now() - start;
  const url = new URL(c.req.url);
  const pathname = url.pathname;
  const method = c.req.method;
  const status = c.res.status;
  const userAgent = c.req.header("User-Agent") || "";
  const referer = c.req.header("Referer") || "direct";
  const country = c.req.header("CF-IPCountry") || "unknown";
  const colo = c.req.header("CF-RAY")?.split("-")[1] || "unknown";

  // Simple bot detection based on user agent
  const botPatterns = [
    "googlebot", "bingbot", "slurp", "duckduckbot", "baiduspider",
    "yandexbot", "facebookexternalhit", "twitterbot", "linkedinbot",
    "whatsapp", "telegrambot", "discordbot", "pinterestbot",
    "semrushbot", "ahrefsbot", "mj12bot", "dotbot"
  ];
  const isBot = botPatterns.some(pattern =>
    userAgent.toLowerCase().includes(pattern)
  );

  // Determine request type
  let requestType = "page";
  if (pathname.startsWith("/api/")) {
    requestType = "api";
  } else if (pathname.startsWith("/assets/")) {
    requestType = "asset";
  }

  // Write to Analytics Engine
  // blobs: string fields (max 32 bytes each)
  // doubles: numeric fields
  // indexes: indexed fields for filtering (max 1 byte each, use as flags)
  try {
    c.env.ANALYTICS.writeDataPoint({
      blobs: [
        pathname.slice(0, 32),           // blob1: pathname
        method.slice(0, 10),             // blob2: HTTP method
        referer.slice(0, 32),            // blob3: referer
        country.slice(0, 2),             // blob4: country code
        colo.slice(0, 10),               // blob5: colo code
        requestType.slice(0, 10),        // blob6: request type
        isBot ? "bot" : "human",         // blob7: bot/human
      ],
      doubles: [
        duration,                        // double1: response time (ms)
        status,                          // double2: HTTP status code
      ],
      indexes: [
        isBot ? "1" : "0",                   // index1: is_bot flag
      ],
    });
  } catch (err) {
    // Analytics Engine write failed — don't block the response
    console.error("[analytics] write failed:", err);
  }
};

/**
 * Query analytics data from the last N hours.
 * Note: Analytics Engine doesn't support direct SQL queries from Workers.
 * This is a placeholder for future implementation using the GraphQL API.
 * For now, analytics data is viewable in the Cloudflare dashboard.
 */
export interface AnalyticsSummary {
  totalRequests: number;
  avgResponseTime: number;
  botPercentage: number;
  topCountries: Array<{ country: string; count: number }>;
  topPaths: Array<{ path: string; count: number }>;
}

/**
 * Get analytics summary (placeholder — requires GraphQL API integration).
 * For now, returns a simple structure that can be enhanced later.
 */
export async function getAnalyticsSummary(
  _env: Env,
  _hours: number = 24
): Promise<AnalyticsSummary> {
  // Analytics Engine data is accessible via the Cloudflare GraphQL API,
  // not directly from the Worker. This would require:
  // 1. Making a request to https://api.cloudflare.com/client/v4/graphql
  // 2. Using the account's API token with Analytics permissions
  // 3. Querying the analytics_engine dataset

  // For now, return a placeholder. In production, integrate with GraphQL API.
  return {
    totalRequests: 0,
    avgResponseTime: 0,
    botPercentage: 0,
    topCountries: [],
    topPaths: [],
  };
}
