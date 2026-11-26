const TELEMETRY_ENDPOINT = "/api/telemetry";
const DEFAULT_SAMPLE_RATE = 0.25;
const MAX_ERROR_REPORTS_PER_SESSION = 10;

let errorReportsSent = 0;
const reportedErrorKeys = new Set<string>();

function isEdgeHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return false;
  if (h.endsWith(".lovable.app") || h.endsWith(".lovableproject.com")) return false;
  return true;
}

function isTelemetryEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(import.meta.env.PROD) && isEdgeHost();
}

function sendTelemetry(payload: Record<string, unknown>): void {
  if (!isTelemetryEnabled()) return;

  let json: string;
  try {
    json = JSON.stringify(payload);
  } catch {
    return;
  }

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([json], { type: "application/json" });
      if (navigator.sendBeacon(TELEMETRY_ENDPOINT, blob)) {
        return;
      }
    }
  } catch {
    // Fall back to keepalive fetch below
  }

  try {
    void fetch(TELEMETRY_ENDPOINT, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: json,
    }).catch(() => {});
  } catch {
    // Telemetry must never throw
  }
}

function sanitizeErrorMessage(raw: string): string {
  return raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/Bearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "[jwt]")
    .replace(/\b(?:sb_publishable|sbp|lm)_[A-Za-z0-9._-]{8,}\b/gi, "[token]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\?[^\s]*/g, "")
    .trim()
    .slice(0, 200);
}

function unwrapError(err: unknown): unknown {
  if (err && typeof err === "object" && !Array.isArray(err) && "error" in err) {
    return (err as { error?: unknown }).error ?? err;
  }
  return err;
}

function quickCategory(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (/jwt|token|unauthorized|session/i.test(msg)) return "auth";
  if (/fetch|network|offline|dynamically imported|module script failed|loading chunk/i.test(msg)) {
    return "network";
  }
  if (/validation|invalid|missing/i.test(msg)) return "validation";
  return "unknown";
}

function quickHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Report a sanitized, deduplicated client error to `/api/telemetry`.
 * No-ops in dev/test and on non-Worker hosts (`localhost`, preview domains).
 */
export function reportClientError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (!isTelemetryEnabled()) return;
  if (errorReportsSent >= MAX_ERROR_REPORTS_PER_SESSION) return;

  const unwrapped = unwrapError(error);
  const name = unwrapped instanceof Error ? unwrapped.name : typeof unwrapped;
  const rawMessage =
    unwrapped instanceof Error
      ? unwrapped.message
      : typeof unwrapped === "string"
        ? unwrapped
        : (() => {
            try {
              return JSON.stringify(unwrapped);
            } catch {
              return String(unwrapped);
            }
          })();

  const cleanMessage = sanitizeErrorMessage(rawMessage || "Unknown client error");
  const dedupKey = `${name}:${cleanMessage}`;
  if (reportedErrorKeys.has(dedupKey)) return;
  reportedErrorKeys.add(dedupKey);
  errorReportsSent += 1;

  const category =
    typeof context?.category === "string" ? context.category : quickCategory(unwrapped);
  const code =
    typeof context?.code === "string"
      ? context.code
      : `0x${category.slice(0, 3).toUpperCase()}-${quickHash(dedupKey)}`;

  const ctxLabel =
    typeof context?.context === "string"
      ? context.context.slice(0, 120)
      : typeof context?.boundary === "string"
        ? context.boundary.slice(0, 120)
        : undefined;

  sendTelemetry({
    kind: "error",
    code,
    category,
    name: String(name).slice(0, 80),
    message: cleanMessage,
    path: window.location.pathname.slice(0, 256),
    ...(ctxLabel ? { context: ctxLabel } : {}),
  });
}

export function resetTelemetrySessionForTest(): void {
  errorReportsSent = 0;
  reportedErrorKeys.clear();
}

/**
 * Observe Core Web Vitals (TTFB, FCP, LCP, CLS, INP) using PerformanceObserver
 * and flush once on page hide / visibility hidden.
 */
export function initWebVitals(sampleRate = DEFAULT_SAMPLE_RATE): () => void {
  if (!isTelemetryEnabled()) return () => {};
  if (typeof PerformanceObserver === "undefined") return () => {};
  if (Math.random() >= sampleRate) return () => {};

  const observers: PerformanceObserver[] = [];
  const metrics: {
    LCP?: number;
    INP?: number;
    CLS?: number;
    FCP?: number;
    TTFB?: number;
  } = {};

  try {
    const navEntries = performance.getEntriesByType("navigation");
    const nav = navEntries[0] as PerformanceNavigationTiming | undefined;
    if (nav && Number.isFinite(nav.responseStart) && Number.isFinite(nav.requestStart)) {
      metrics.TTFB = Math.max(0, Math.round(nav.responseStart - nav.requestStart));
    }
  } catch {
    // Navigation timing unavailable
  }

  const registerObserver = (
    init: PerformanceObserverInit,
    handler: (list: PerformanceObserverEntryList) => void
  ) => {
    try {
      const obs = new PerformanceObserver(handler);
      obs.observe(init);
      observers.push(obs);
    } catch {
      // Unsupported entryType in this browser
    }
  };

  registerObserver({ type: "paint", buffered: true }, (list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === "first-contentful-paint") {
        metrics.FCP = Math.round(entry.startTime);
      }
    }
  });

  registerObserver({ type: "largest-contentful-paint", buffered: true }, (list) => {
    const entries = list.getEntries();
    const last = entries[entries.length - 1];
    if (last) {
      metrics.LCP = Math.round(last.startTime);
    }
  });

  let sessionValue = 0;
  let sessionEntries: PerformanceEntry[] = [];
  let maxCls = 0;
  registerObserver({ type: "layout-shift", buffered: true }, (list) => {
    for (const rawEntry of list.getEntries()) {
      const entry = rawEntry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
      if (entry.hadRecentInput || typeof entry.value !== "number") continue;
      const first = sessionEntries[0];
      const prev = sessionEntries[sessionEntries.length - 1];
      if (
        prev &&
        first &&
        entry.startTime - prev.startTime < 1000 &&
        entry.startTime - first.startTime < 5000
      ) {
        sessionValue += entry.value;
        sessionEntries.push(entry);
      } else {
        sessionValue = entry.value;
        sessionEntries = [entry];
      }
      if (sessionValue > maxCls) {
        maxCls = sessionValue;
        metrics.CLS = Number(maxCls.toFixed(4));
      }
    }
  });

  const interactions = new Map<number, number>();
  registerObserver(
    { type: "event", buffered: true, durationThreshold: 40 } as PerformanceObserverInit,
    (list) => {
      for (const rawEntry of list.getEntries()) {
        const entry = rawEntry as PerformanceEntry & { interactionId?: number };
        if (!entry.interactionId) continue;
        const prev = interactions.get(entry.interactionId) ?? 0;
        if (entry.duration > prev) {
          interactions.set(entry.interactionId, entry.duration);
        }
      }
      if (interactions.size > 0) {
        const sorted = Array.from(interactions.values()).sort((a, b) => b - a);
        const p98Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.02));
        metrics.INP = Math.round(sorted[p98Index]);
      }
    }
  );

  let flushed = false;
  const flush = () => {
    if (flushed) return;
    if (Object.keys(metrics).length === 0) return;
    flushed = true;

    const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
    sendTelemetry({
      kind: "vitals",
      path: window.location.pathname.slice(0, 256) || "/",
      metrics,
      device: window.innerWidth < 768 ? "mobile" : "desktop",
      ...(conn?.effectiveType ? { connection: conn.effectiveType } : {}),
    });
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      flush();
    }
  };
  const onPageHide = () => {
    flush();
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", onPageHide);

  return () => {
    for (const obs of observers) {
      try {
        obs.disconnect();
      } catch {
        /* ignore */
      }
    }
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", onPageHide);
  };
}
