import { Hono } from "hono";
import { z } from "zod";
import { getClientIP, handleRouteError, isAllowedOrigin, readJsonObject } from "../lib/http";
import { checkRateLimitKV, enrollEmailLimiter } from "../lib/rate-limit";
import { isValidEmail, sanitizeObject, singleLine } from "../lib/sanitize";
import { getPublicSupabase, getSupabase, resolveServiceRoleKey } from "../lib/supabase";
import { verifyTurnstile } from "../lib/turnstile";
import type { AppEnv } from "../lib/types";

const enrollRoutes = new Hono<AppEnv>();

const enrollSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .refine((v) => isValidEmail(v), "Invalid email address"),
  phone: z
    .string()
    .trim()
    .min(10, "Phone number must be at least 10 characters")
    .max(20)
    .refine((v) => v.replace(/\D/g, "").length >= 7, "Invalid phone number"),
  grade: z.string().trim().min(1, "Grade/department is required").max(50),
  interest: z.string().trim().min(1, "Area of interest is required").max(100),
  reason: z.string().trim().min(10, "Please share at least 10 characters").max(500),
  consent_given: z
    .boolean()
    .refine((v) => v === true, "Privacy consent is required"),
  privacy_policy_version: z.string().trim().max(40).optional().default("v1.0_2025-01-22"),
});

enrollRoutes.post("/api/enroll", async (c) => {
  try {
    const origin = c.req.header("Origin") || "";
    if (!origin || !isAllowedOrigin(origin, c.env)) {
      return c.json({ error: "Enrollment submissions are only accepted from dvpyic.dpdns.org." }, 403);
    }

    const body = sanitizeObject(await readJsonObject(c)) as Record<string, unknown>;
    const rawToken =
      typeof body.turnstileToken === "string" && body.turnstileToken.trim()
        ? body.turnstileToken.trim()
        : c.req.header("X-Turnstile-Token")?.trim() || "";

    if (!rawToken) {
      return c.json({ error: "Security verification required. Please complete the challenge." }, 403);
    }

    const normalized = {
      name: typeof body.name === "string" ? singleLine(body.name, 100) : body.name,
      email: body.email,
      phone: body.phone,
      grade: body.grade ?? body.year ?? body.department,
      interest: body.interest ?? body.interests,
      reason: body.reason ?? body.message,
      consent_given: body.consent_given ?? body.consent,
      privacy_policy_version: body.privacy_policy_version,
    };

    const parsed = enrollSchema.safeParse(normalized);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
      return c.json({ error: msg }, 400);
    }

    const verified = await verifyTurnstile(rawToken, c.env, getClientIP(c));
    if (!verified) {
      return c.json({ error: "Security verification failed. Please try again." }, 403);
    }

    // Secondary per-email rate limit (3/hour) mirroring DB check_enrollment_rate_limit
    const emailLimit = await checkRateLimitKV(
      c.env,
      `enroll:email:${parsed.data.email}`,
      3,
      3_600_000,
      enrollEmailLimiter
    );
    if (!emailLimit.allowed) {
      c.header("Retry-After", String(Math.max(1, Math.ceil(emailLimit.resetMs / 1000))));
      return c.json({ error: "Too many enrollment attempts for this email. Please try again later." }, 429);
    }

    const row = {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      grade: parsed.data.grade,
      interest: parsed.data.interest,
      reason: parsed.data.reason,
      consent_given: true,
      consent_timestamp: new Date().toISOString(),
      privacy_policy_version: parsed.data.privacy_policy_version,
    };

    const hasService = Boolean(resolveServiceRoleKey(c.env));
    const sb = hasService ? getSupabase(c.env) : getPublicSupabase(c.env);

    const handleInsertError = (error: { code?: string }) => {
      if (error.code === "23505") {
        return c.json({ error: "An enrollment with this email already exists." }, 409);
      }
      if (error.code === "P0001" || error.code === "22P02") {
        return c.json({ error: "Invalid enrollment details. Please check your input and try again." }, 400);
      }
      throw error;
    };

    if (hasService) {
      const { data, error } = await sb
        .from("enrollment_submissions")
        .insert([row])
        .select("id")
        .single();
      if (error) {
        return handleInsertError(error);
      }
      return c.json({ ok: true, id: (data as { id?: string } | null)?.id }, 201);
    }

    // Publishable-key fallback: omit .select() because enrollment_submissions SELECT RLS is admin-only
    const { error } = await sb.from("enrollment_submissions").insert([row]);
    if (error) {
      return handleInsertError(error);
    }
    return c.json({ ok: true }, 201);
  } catch (error: unknown) {
    return handleRouteError(c, error);
  }
});

export default enrollRoutes;
