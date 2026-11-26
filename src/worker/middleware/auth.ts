import type { Context, Next } from "hono";
import type { User } from "@supabase/supabase-js";
import { ROLE_PERMISSIONS, type AppRole } from "../../lib/rbac";
import type { AppEnv } from "../lib/types";
import { getPublicSupabase, getSupabase, resolveServiceRoleKey } from "../lib/supabase";

export const authMiddleware = async (c: Context<AppEnv>, next: Next) => {
  const authHeader = c.req.header("Authorization") || "";
  const match = /^Bearer\s+(\S+)$/i.exec(authHeader);
  if (!match) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }
  const token = match[1];

  let supabase: ReturnType<typeof getSupabase>;
  let supabaseMode: "service" | "user";
  try {
    if (resolveServiceRoleKey(c.env)) {
      supabase = getSupabase(c.env);
      supabaseMode = "service";
    } else {
      supabase = getPublicSupabase(c.env, `Bearer ${token}`);
      supabaseMode = "user";
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "[authMiddleware] Supabase client unavailable",
        error: err instanceof Error ? err.message : String(err),
      })
    );
    return c.json({ error: "Service temporarily unavailable. Please try again." }, 503);
  }

  c.set("supabase", supabase);
  c.set("supabaseMode", supabaseMode);

  let user: User | null = null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return c.json({ error: "Unauthorized: Invalid token" }, 401);
    }
    user = data.user;
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "[authMiddleware] getUser failed",
        error: err instanceof Error ? err.message : String(err),
      })
    );
    return c.json({ error: "Service temporarily unavailable. Please try again." }, 503);
  }

  let resolvedRole: AppRole = null;

  try {
    const { data: cmsRole, error: roleErr } = await supabase.rpc("get_cms_role", {
      p_user_id: user.id,
    });
    if (roleErr) throw roleErr;

    resolvedRole = (cmsRole ?? null) as AppRole;
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        message: `[authMiddleware] Role verification failed for user ${user.id}`,
        error: err instanceof Error ? err.message : String(err),
      })
    );
    return c.json({ error: "Service temporarily unavailable. Please try again." }, 503);
  }

  if (!resolvedRole) {
    return c.json({ error: "Forbidden: CMS access required" }, 403);
  }

  c.set("user", user);
  c.set("role", resolvedRole);
  await next();
};

export const requirePermission = (permission: string) => {
  return async (c: Context<AppEnv>, next: Next) => {
    const role = c.get("role");
    if (!role) {
      return c.json({ error: "Forbidden: No role assigned" }, 403);
    }
    const permissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
    if (!permissions.includes("all") && !permissions.includes(permission)) {
      return c.json({ error: `Forbidden: Requires '${permission}' permission` }, 403);
    }
    await next();
  };
};
