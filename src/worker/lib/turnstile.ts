import type { Env } from "./types";

export async function verifyTurnstile(
  token: string | null | undefined,
  env: Env,
  remoteIp?: string
): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) {
    if ((env.NODE_ENV || "production") !== "production") {
      console.warn(
        JSON.stringify({
          level: "warn",
          message: "[turnstile] Secret key not configured in development. Bypassing Turnstile verification.",
        })
      );
      return true;
    }
    return false;
  }
  if (!token) return false;

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
        ...(remoteIp && remoteIp !== "unknown" ? { remoteip: remoteIp } : {}),
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return false;
    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "[turnstile] verification failed",
        error: err instanceof Error ? err.message : String(err),
      })
    );
    return false;
  }
}
