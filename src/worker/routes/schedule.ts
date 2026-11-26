import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware, requirePermission } from "../middleware/auth";
import { purgePublicCache, serveCachedList } from "../lib/cache";
import { HttpError, handleRouteError, readJsonObject } from "../lib/http";
import { UUID_RE, sanitizeObject } from "../lib/sanitize";
import { SCHEDULE_CACHE_KEY, type AppEnv } from "../lib/types";

const scheduleRoutes = new Hono<AppEnv>();

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();

const scheduleBodySchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    description: nullableText(2000),
    day_of_week: z.enum(DAYS_OF_WEEK).nullable().optional(),
    start_time: z.string().regex(TIME_RE, "start_time must be HH:MM").nullable().optional(),
    end_time: z.string().regex(TIME_RE, "end_time must be HH:MM").nullable().optional(),
    location: nullableText(200),
    is_active: z.boolean().nullable().optional(),
  })
  .strict();

function parseScheduleBody(raw: unknown, partial: boolean) {
  const schema = partial ? scheduleBodySchema.partial() : scheduleBodySchema;
  const cleaned = sanitizeObject(raw) as Record<string, unknown>;
  for (const field of ["start_time", "end_time"]) {
    if (cleaned[field] === "") cleaned[field] = null;
  }
  const result = schema.safeParse(cleaned);
  if (!result.success) {
    const message = result.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
    throw new HttpError(400, message);
  }
  if (partial && Object.keys(result.data).length === 0) {
    throw new HttpError(400, "No updatable fields provided");
  }
  const { start_time, end_time } = result.data;
  if (start_time && end_time && end_time.slice(0, 5) <= start_time.slice(0, 5)) {
    throw new HttpError(400, "end_time must be after start_time");
  }
  return result.data;
}

scheduleRoutes.get("/api/schedule", (c) =>
  serveCachedList(c, SCHEDULE_CACHE_KEY, async (sb) =>
    await sb
      .from("schedule")
      .select("*")
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(500)
  )
);

scheduleRoutes.post("/api/schedule", authMiddleware, requirePermission("schedule"), async (c) => {
  try {
    const body = parseScheduleBody(await readJsonObject(c), false);
    const supabase = c.get("supabase");
    const { data, error } = await supabase.from("schedule").insert(body).select().single();
    if (error) throw error;

    await purgePublicCache(c, SCHEDULE_CACHE_KEY, "/api/schedule");
    return c.json({ success: true, data }, 201);
  } catch (error: unknown) {
    return handleRouteError(c, error);
  }
});

scheduleRoutes.put("/api/schedule/:id", authMiddleware, requirePermission("schedule"), async (c) => {
  try {
    const id = c.req.param("id") ?? "";
    if (!UUID_RE.test(id)) return c.json({ error: "Invalid schedule id" }, 400);
    const body = parseScheduleBody(await readJsonObject(c), true);
    const supabase = c.get("supabase");
    const { data, error } = await supabase
      .from("schedule")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return c.json({ error: "Schedule item not found" }, 404);

    await purgePublicCache(c, SCHEDULE_CACHE_KEY, "/api/schedule");
    return c.json({ success: true, data });
  } catch (error: unknown) {
    return handleRouteError(c, error);
  }
});

scheduleRoutes.delete("/api/schedule/:id", authMiddleware, requirePermission("schedule"), async (c) => {
  try {
    const id = c.req.param("id") ?? "";
    if (!UUID_RE.test(id)) return c.json({ error: "Invalid schedule id" }, 400);
    const supabase = c.get("supabase");
    const { data, error } = await supabase.from("schedule").delete().eq("id", id).select("id");
    if (error) throw error;
    if (!data || data.length === 0) return c.json({ error: "Schedule item not found" }, 404);

    await purgePublicCache(c, SCHEDULE_CACHE_KEY, "/api/schedule");
    return c.json({ success: true });
  } catch (error: unknown) {
    return handleRouteError(c, error);
  }
});

export default scheduleRoutes;
