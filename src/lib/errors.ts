/**
 * Centralized error handling utilities.
 * Maps Postgrest / network / unknown errors into user-safe messages,
 * provides logging that respects production privacy, and a retry helper.
 */
import { toast } from "@/hooks/use-toast";
import { getOnlineStatus } from "@/hooks/useOnlineStatus";

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
    !Array.isArray(err) &&
    ("code" in err || ("message" in err && "details" in err))
  );
}

// --- Circuit Breaker Pattern ---
// Uses per-session state to avoid affecting other users in the same SPA
let consecutiveFailures = 0;
const CIRCUIT_BREAKER_THRESHOLD = 5;
let circuitBreakerTripped = false;
let circuitBreakerResetTime = 0;
let lastUserId: string | null = null;

export function checkCircuitBreaker(userId?: string): boolean {
  // Reset breaker if user changed (different session)
  if (userId && userId !== lastUserId) {
    circuitBreakerTripped = false;
    consecutiveFailures = 0;
    lastUserId = userId;
  }
  if (circuitBreakerTripped && Date.now() > circuitBreakerResetTime) {
    circuitBreakerTripped = false;
    consecutiveFailures = 0;
  }
  return circuitBreakerTripped;
}

export function reportSuccess(): void {
  consecutiveFailures = 0;
  circuitBreakerTripped = false;
}

export function reportFailure(): void {
  consecutiveFailures++;
  if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD && !circuitBreakerTripped) {
    circuitBreakerTripped = true;
    circuitBreakerResetTime = Date.now() + 30000;
    console.warn("[CircuitBreaker] Tripped! Too many consecutive failures.");
  }
}

// --- Error Categorization ---
export type ErrorCategory = 'auth' | 'network' | 'validation' | 'server' | 'unknown';

export function categorizeError(err: AnyError): ErrorCategory {
  if (isAbortError(err)) return 'network';
  if (isPostgrestError(err)) {
    if (err.code === 'PGRST301' || err.code === '42501') return 'auth';
    if (err.code?.startsWith('22') || err.code?.startsWith('23') || err.code === 'P0001') return 'validation';
    return 'server';
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (/jwt|token|unauthorized|session/i.test(msg)) return 'auth';
  if (/fetch|network|failed to fetch|offline/i.test(msg)) return 'network';
  if (/validation|invalid|missing/i.test(msg)) return 'validation';
  return 'unknown';
}

/**
 * Returns a sanitized, user-facing message — never exposes stack traces
 * or internal SQL hints in production.
 */
export function getSafeErrorMessage(err: AnyError, fallback = "Something went wrong."): string {
  if (checkCircuitBreaker()) {
    return "Service is temporarily unavailable due to high load or network issues. Please try again in 30 seconds.";
  }

  if (!err) return fallback;
  if (typeof err === "string") return err;

  const category = categorizeError(err);
  if (category === 'network') reportFailure();

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
      const result = await fn();
      reportSuccess();
      return result;
    } catch (err) {
      lastErr = err;
      if (categorizeError(err) === 'network') reportFailure();
      
      if (attempt === retries) break;
      if (shouldRetry && !shouldRetry(err)) break;
      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

/* ------------------------------------------------------------------ */
/*  Global error capture — toasts + dedup + noise filtering           */
/* ------------------------------------------------------------------ */

const recentErrors = new Map<string, number>();
const ERROR_DEDUP_WINDOW_MS = 5_000;
const TOAST_THROTTLE_MS = 8_000;
let lastToastAt = 0;

/**
 * Errors we explicitly ignore — browser extensions, third-party scripts,
 * benign aborts, and known harmless ResizeObserver chatter.
 */
const IGNORED_PATTERNS: RegExp[] = [
  /ResizeObserver loop/i,
  /ResizeObserver loop completed/i,
  /Non-Error promise rejection captured/i,
  /Script error\.?$/i, // cross-origin scripts (no useful info)
  /AbortError/i,
  /^cancel(l|le)ed$/i,
  /chrome-extension:\/\//i,
  /moz-extension:\/\//i,
  /Failed to fetch dynamically imported module/i, // handled by ErrorBoundary
  /Importing a module script failed/i,
  /Loading chunk \d+ failed/i,
  /Load failed/i,
  /NetworkError when attempting to fetch resource/i, // surfaced by individual callers
];

function shouldIgnore(message: string): boolean {
  return IGNORED_PATTERNS.some((re) => re.test(message));
}

function dedupKey(err: unknown): string {
  if (!err) return "null";
  if (typeof err === "string") return err.slice(0, 200);
  if (err instanceof Error) return `${err.name}:${err.message.slice(0, 200)}`;
  try {
    return JSON.stringify(err).slice(0, 200);
  } catch {
    return String(err).slice(0, 200);
  }
}

function isDuplicate(err: unknown): boolean {
  const key = dedupKey(err);
  const now = Date.now();
  const last = recentErrors.get(key);
  if (last && now - last < ERROR_DEDUP_WINDOW_MS) return true;
  recentErrors.set(key, now);
  // Trim map periodically.
  if (recentErrors.size > 50) {
    for (const [k, t] of recentErrors) {
      if (now - t > ERROR_DEDUP_WINDOW_MS * 2) recentErrors.delete(k);
    }
  }
  return false;
}

function maybeShowGlobalToast(err: unknown, context: string): void {
  const msg = typeof err === "string" ? err : err instanceof Error ? err.message : "";
  if (msg && shouldIgnore(msg)) return;
  if (isDuplicate(err)) return;

  const now = Date.now();
  if (now - lastToastAt < TOAST_THROTTLE_MS) return;
  lastToastAt = now;

  // Use the verified online status from the centralized hook instead of
  // raw navigator.onLine which can be transiently false during route changes.
  const { isOnline } = getOnlineStatus();
  const offline = !isOnline;
  const description = offline
    ? "You appear to be offline. Some features may not work until you reconnect."
    : getSafeErrorMessage(err, "Something went wrong. Please try again.");

  logError(err, context);
  toast({
    variant: "destructive",
    title: offline ? "Connection lost" : "Unexpected error",
    description,
  });
}

/**
 * Install global handlers for unhandled errors, promise rejections,
 * and offline events. Surfaces a single throttled, deduped toast to the user.
 * Call once from main.tsx.
 */
export function installGlobalErrorHandlers(): void {
  if (typeof window === "undefined") return;
  // Guard against double-install (e.g. HMR).
  if ((window as unknown as { __errHandlersInstalled?: boolean }).__errHandlersInstalled) return;
  (window as unknown as { __errHandlersInstalled?: boolean }).__errHandlersInstalled = true;

  window.addEventListener("error", (event) => {
    const target = event.target as HTMLElement | null;
    // Resource loading errors (img/script/link) — log only, no toast.
    if (target && target !== (window as unknown) && "tagName" in target) {
      const src = (target as HTMLImageElement).src ?? "";
      // Suppress logging for known non-image URLs (e.g. ibb.co page links)
      // — these are already handled gracefully by OptimizedImage fallback.
      try {
        const parsed = new URL(src);
        if (parsed.hostname === "ibb.co" && !/\.(jpe?g|png|gif|webp|avif|svg)$/i.test(parsed.pathname)) {
          return;
        }
      } catch { /* ignore parse errors */ }
      logError(
        { tag: target.tagName, src },
        "resource.error"
      );
      return;
    }
    maybeShowGlobalToast(event.error ?? event.message, "window.error");
  }, true);

  window.addEventListener("unhandledrejection", (event) => {
    maybeShowGlobalToast(event.reason, "unhandledrejection");
  });

  // Offline / online toasts — DELEGATED to useOnlineStatus hook.
  //
  // Previously this used raw window.addEventListener("offline"/"online")
  // which fired immediately on every browser event — including spurious ones
  // during SPA route changes, lazy chunk loading, and service worker activity.
  //
  // The useOnlineStatus hook already debounces offline events (3 s) and
  // verifies with a real connectivity check before broadcasting. The
  // OfflineBanner component in App.tsx subscribes to that verified state.
  //
  // Keeping raw listeners here would cause duplicate, unverified toasts.
}

