import { Hono } from "hono";

// Cloudflare Workers environment type
type Env = {
  NODE_ENV?: string;
};

// Create Hono app with Cloudflare Bindings type
const app = new Hono<{ Bindings: Env }>();

// Health check endpoint
app.get("/api/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// Example API endpoint - can be extended for server-side operations
app.get("/api/info", (c) => c.json({
  name: "Spark Labs Landing",
  version: "1.0.0",
  environment: c.env.NODE_ENV || "production"
}));

// Example: Protected API route that could use Supabase service role
app.get("/api/stats", async (c) => {
  // This is where you could add server-side only operations
  // using Cloudflare secrets or Supabase service role key
  return c.json({
    message: "Server-side stats endpoint",
    // Access Cloudflare-specific features like KV, D1, R2 here
  });
});

export default app;
