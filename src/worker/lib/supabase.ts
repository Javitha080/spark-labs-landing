import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "./types";

const SUPABASE_FETCH_TIMEOUT_MS = 5000;

export const fetchWithDeadline: typeof fetch = (input, init) => {
  const deadline = AbortSignal.timeout(SUPABASE_FETCH_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, deadline]) : deadline;
  return fetch(input, { ...init, signal });
};

export const resolveSupabaseUrl = (env: Env): string => {
  const meta = import.meta as ImportMeta & { env?: Record<string, string> };
  return (
    env.SUPABASE_URL ||
    env.VITE_SUPABASE_URL ||
    (env.VITE_SUPABASE_PROJECT_ID ? `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co` : undefined) ||
    meta.env?.VITE_SUPABASE_URL ||
    ""
  );
};

export const getPublicSupabase = (env: Env, authorization?: string): SupabaseClient => {
  const meta = import.meta as ImportMeta & { env?: Record<string, string> };
  const url = resolveSupabaseUrl(env);
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  if (!url || !key) {
    throw new Error(
      "Publishable Supabase key is missing. Refusing to escalate public reads to service_role."
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: fetchWithDeadline,
      ...(authorization ? { headers: { Authorization: authorization } } : {}),
    },
  });
};

export const resolveServiceRoleKey = (env: Env): string | undefined => {
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseKey || supabaseKey === "YOUR_SERVICE_ROLE_KEY_HERE") return undefined;

  if (supabaseKey.startsWith("eyJ")) {
    try {
      const payload = JSON.parse(atob(supabaseKey.split(".")[1]));
      const expectedRef = env.VITE_SUPABASE_PROJECT_ID;
      if (expectedRef && payload.ref && payload.ref !== expectedRef) {
        console.warn(
          JSON.stringify({
            level: "warn",
            message: `[supabase] SUPABASE_SERVICE_ROLE_KEY belongs to project "${payload.ref}" but expected "${expectedRef}". Discarding mismatched key.`,
          })
        );
        return undefined;
      }
    } catch {
      // Not a valid JWT - might be new key format, let it through
    }
  }
  return supabaseKey;
};

export const getSupabase = (env: Env): SupabaseClient => {
  const meta = import.meta as ImportMeta & { env?: Record<string, string> };
  const supabaseUrl = resolveSupabaseUrl(env);

  const resolved = resolveServiceRoleKey(env);
  let supabaseKey = resolved;

  if (!resolved) {
    const isProduction = (env.NODE_ENV || "production") === "production";
    if (isProduction) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is missing or set to a placeholder. " +
          "The Worker cannot start in production without a valid service role key. " +
          "Set it via `wrangler secret put SUPABASE_SERVICE_ROLE_KEY`."
      );
    }

    const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || "";
    if (publishableKey) {
      console.warn(
        JSON.stringify({
          level: "warn",
          message:
            "[supabase] Warning: Using publishable key fallback because SUPABASE_SERVICE_ROLE_KEY is missing, a placeholder, or mismatched. Admin actions will not be available.",
        })
      );
      supabaseKey = publishableKey;
    }
  }

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "SUPABASE_URL and a Supabase key must be set in Cloudflare environment variables."
    );
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input, init) => {
        const start = Date.now();
        const response = await fetchWithDeadline(input, init);
        const duration = Date.now() - start;

        if (env.ANALYTICS) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (env.ANALYTICS as any).writeDataPoint({
              blobs: ["supabase_api", "FETCH", response.status.toString()],
              doubles: [duration],
            });
          } catch {
            /* ignore */
          }
        }

        return response;
      },
    },
  });
};
