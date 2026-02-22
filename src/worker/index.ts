import { Hono } from "hono";

import { createClient } from "@supabase/supabase-js";

// Cloudflare Workers environment type
type Env = {
  NODE_ENV?: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};

// Create Hono app with Cloudflare Bindings type
const app = new Hono<{ Bindings: Env }>();

// Security Headers Middleware
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://cdn.jsdelivr.net https://ai.gateway.lovable.dev https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://storage.googleapis.com https://static.vecteezy.com https://*.vecteezy.com https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://tiles.basemaps.cartocdn.com https://demotiles.maplibre.org https://mapcn.vercel.app https://grainy-gradients.vercel.app https://i.pinimg.com https://pbs.twimg.com; connect-src 'self' blob: https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://maps.googleapis.com https://ai.gateway.lovable.dev https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://tiles.basemaps.cartocdn.com https://demotiles.maplibre.org https://mapcn.vercel.app https://fonts.googleapis.com https://fonts.gstatic.com https://static.vecteezy.com https://*.vecteezy.com https://i.pinimg.com https://cdn.jsdelivr.net wss://localhost:* https://cloudflareinsights.com https://*.cloudflareinsights.com https://static.cloudflareinsights.com; worker-src 'self' blob:; frame-src 'self' https://www.google.com; object-src 'none'; base-uri 'self'; form-action 'self'");
});

// Health check endpoint
app.get("/api/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// Example API endpoint - can be extended for server-side operations
app.get("/api/info", (c) => c.json({
  name: "YICDVP",
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

// Helper to create Supabase client
const getSupabase = (env: Env) => {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
};

// --- Schedule API Routes ---

app.get("/api/schedule", async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const { data, error } = await supabase
      .from("schedule")
      .select("*")
      .order("day_of_week", { ascending: true });

    if (error) throw error;
    return c.json(data || []);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/api/schedule", async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const body = await c.req.json();
    const { data, error } = await supabase
      .from("schedule")
      .insert([body]);

    if (error) throw error;
    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.put("/api/schedule/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const supabase = getSupabase(c.env);
    const body = await c.req.json();
    const { data, error } = await supabase
      .from("schedule")
      .update(body)
      .eq("id", id);

    if (error) throw error;
    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/api/schedule/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const supabase = getSupabase(c.env);
    const { error } = await supabase
      .from("schedule")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// --- Activity Log API Routes ---

app.get("/api/activities", async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const dateRange = c.req.query("dateRange") || "7days";

    let fromDate = new Date();
    if (dateRange === "today") {
      fromDate.setDate(fromDate.getDate() - 1);
    } else if (dateRange === "7days") {
      fromDate.setDate(fromDate.getDate() - 7);
    } else if (dateRange === "30days") {
      fromDate.setDate(fromDate.getDate() - 30);
    } else if (dateRange === "all") {
      fromDate = new Date(0);
    }
    const fromDateStr = fromDate.toISOString();

    const activities: any[] = [];

    // Fetch enrollment submissions
    const { data: enrollments } = await supabase
      .from("enrollment_submissions")
      .select("id, name, email, status, created_at")
      .gte("created_at", fromDateStr)
      .order("created_at", { ascending: false })
      .limit(50);

    if (enrollments) {
      enrollments.forEach((e) => {
        activities.push({
          id: `enroll-${e.id}`,
          user_id: "system",
          user_email: e.email,
          user_name: e.name,
          action: "create",
          resource_type: "enrollment",
          resource_id: e.id,
          resource_name: e.name,
          details: { status: e.status },
          created_at: e.created_at,
        });
      });
    }

    // Fetch blog posts
    const { data: blogPosts } = await supabase
      .from("blog_posts")
      .select("id, title, author_name, status, created_at, updated_at")
      .gte("created_at", fromDateStr)
      .order("created_at", { ascending: false })
      .limit(50);

    if (blogPosts) {
      blogPosts.forEach((b) => {
        activities.push({
          id: `blog-${b.id}`,
          user_id: "system",
          user_name: b.author_name,
          action: b.status === "published" ? "publish" : "create",
          resource_type: "blog_post",
          resource_id: b.id,
          resource_name: b.title,
          details: { status: b.status },
          created_at: b.created_at,
        });
      });
    }

    // Fetch events
    const { data: events } = await supabase
      .from("events")
      .select("id, title, category, created_at, updated_at")
      .gte("created_at", fromDateStr)
      .order("created_at", { ascending: false })
      .limit(50);

    if (events) {
      events.forEach((e) => {
        activities.push({
          id: `event-${e.id}`,
          user_id: "system",
          action: "create",
          resource_type: "event",
          resource_id: e.id,
          resource_name: e.title,
          details: { category: e.category },
          created_at: e.created_at,
        });
      });
    }

    // Fetch gallery items
    const { data: galleryItems } = await supabase
      .from("gallery_items")
      .select("id, title, created_at")
      .gte("created_at", fromDateStr)
      .order("created_at", { ascending: false })
      .limit(50);

    if (galleryItems) {
      galleryItems.forEach((g) => {
        activities.push({
          id: `gallery-${g.id}`,
          user_id: "system",
          action: "upload",
          resource_type: "gallery",
          resource_id: g.id,
          resource_name: g.title,
          created_at: g.created_at,
        });
      });
    }

    // Fetch team members
    const { data: teamMembers } = await supabase
      .from("team_members")
      .select("id, name, role, created_at")
      .gte("created_at", fromDateStr)
      .order("created_at", { ascending: false })
      .limit(50);

    if (teamMembers) {
      teamMembers.forEach((t) => {
        activities.push({
          id: `team-${t.id}`,
          user_id: "system",
          action: "create",
          resource_type: "team_member",
          resource_id: t.id,
          resource_name: t.name,
          details: { role: t.role },
          created_at: t.created_at,
        });
      });
    }

    // Fetch projects
    const { data: projects } = await supabase
      .from("projects")
      .select("id, title, category, created_at")
      .gte("created_at", fromDateStr)
      .order("created_at", { ascending: false })
      .limit(50);

    if (projects) {
      projects.forEach((p) => {
        activities.push({
          id: `project-${p.id}`,
          user_id: "system",
          action: "create",
          resource_type: "project",
          resource_id: p.id,
          resource_name: p.title,
          details: { category: p.category },
          created_at: p.created_at,
        });
      });
    }

    // Sort all activities by date
    activities.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return c.json(activities);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default app;
