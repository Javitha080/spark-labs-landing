/**
 * Typed, safe wrapper around supabase.functions.invoke.
 * - 30s timeout via AbortController.
 * - Maps non-2xx + network failures to friendly messages.
 * - Never throws: always returns { data, error }.
 */
import { supabase } from "@/integrations/supabase/client";
import { getSafeErrorMessage, logError } from "@/lib/errors";

interface InvokeOptions {
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

interface InvokeResult<T> {
  data: T | null;
  error: { message: string } | null;
}

export async function invokeFunction<T = unknown>(
  name: string,
  options: InvokeOptions = {}
): Promise<InvokeResult<T>> {
  const { body, headers, timeoutMs = 30_000 } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Note: supabase-js v2 invoke doesn't expose AbortSignal directly,
    // so we race against the timeout.
    const invocation = supabase.functions.invoke<T>(name, { body, headers });
    const timeout = new Promise<never>((_, reject) =>
      controller.signal.addEventListener("abort", () =>
        reject(Object.assign(new Error("Request timed out"), { name: "AbortError" }))
      )
    );

    const { data, error } = (await Promise.race([invocation, timeout])) as Awaited<
      typeof invocation
    >;

    if (error) {
      logError(error, `fn:${name}`);
      return { data: null, error: { message: getSafeErrorMessage(error, "Request failed.") } };
    }
    return { data: (data ?? null) as T | null, error: null };
  } catch (err) {
    logError(err, `fn:${name}`);
    return { data: null, error: { message: getSafeErrorMessage(err, "Request failed.") } };
  } finally {
    clearTimeout(timer);
  }
}
