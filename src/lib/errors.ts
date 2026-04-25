/**
 * Centralized error handling utilities.
 * Maps Postgrest / network / unknown errors into user-safe messages,
 * provides logging that respects production privacy, and a retry helper.
 */
import { toast } from "@/hooks/use-toast";

type AnyError = unknown;

interface PostgrestLike {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

const POSTGREST_MESSAGES: Record<string, string> = {
  PGRST116: "No matching record found.",
  PGRST301: "Your session expired. Please sign in again.",
  "23505": "This entry already exists.",
  "23503": "Cannot complete: related data is missing.",
  "23502": "A required field is missing.",
  "23514": "The submitted value is not allowed.",
  "42501": "You do not have permission to perform this action.",
  "42P01": "Resource is temporarily unavailable.",
  "22P02": "Invalid value submitted.",
  "P0001": "Validation failed. Please check your input.",
};

const SAFE_NETWORK_FALLBACK =
  "Network problem. Please check your connection and try again.";

function isAbortError(err: AnyError): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    ("name" in err && (err as { name?: string }).name === "AbortError")
  );
}

function isPostgrestError(err: AnyError): err is PostgrestLike {
  return (
    !!err &&
    typeof err === "object" &&
    ("code" in err || ("message" in err && "details" in err))
  );
}

/**
 * Returns a sanitized, user-facing message — never exposes stack traces
 * or internal SQL hints in production.
 */
export function getSafeErrorMessage(err: AnyError, fallback = "Something went wrong."): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;

  if (isAbortError(err)) return "Request timed out. Please try again.";

  if (isPostgrestError(err)) {
    if (err.code && POSTGREST_MESSAGES[err.code]) return POSTGREST_MESSAGES[err.code];
    if (err.message) {
      const msg = err.message;
      if (/fetch|network|failed to fetch/i.test(msg)) return SAFE_NETWORK_FALLBACK;
      if (/jwt|token|unauthorized/i.test(msg)) return "Session expired. Please sign in again.";
      if (/rate|too many/i.test(msg)) return "Too many requests. Please slow down.";
      // Don't leak SQL details in production.
      if (import.meta.env.PROD) return fallback;
      return msg;
    }
  }

  if (err instanceof Error) {
    if (/fetch|network/i.test(err.message)) return SAFE_NETWORK_FALLBACK;
    return import.meta.env.PROD ? fallback : err.message;
  }

  return fallback;
}

/**
 * Dev-only structured logging. In production this is a no-op
 * to avoid leaking PII to console.
 */
export function logError(err: AnyError, context?: string): void {
  if (!import.meta.env.DEV) return;
  // eslint-disable-next-line no-console
  console.error(`[error${context ? `:${context}` : ""}]`, err);
}

/**
 * Show a toast with a sanitized message + log internally.
 */
export function toastError(err: AnyError, fallback = "Something went wrong.", context?: string): void {
  const description = getSafeErrorMessage(err, fallback);
  logError(err, context);
  toast({
    variant: "destructive",
    title: "Error",
    description,
  });
}

export function toastSuccess(message: string, title = "Success"): void {
  toast({ title, description: message });
}

interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Only retry when this returns true */
  shouldRetry?: (err: AnyError) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const { retries = 2, baseDelayMs = 400, maxDelayMs = 4000, shouldRetry } = opts;
  let lastErr: AnyError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      if (shouldRetry && !shouldRetry(err)) break;
      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

/**
 * Install global handlers for unhandled errors and promise rejections.
 * Call once from main.tsx.
 */
export function installGlobalErrorHandlers(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    logError(event.error ?? event.message, "window.error");
  });

  window.addEventListener("unhandledrejection", (event) => {
    logError(event.reason, "unhandledrejection");
  });
}
