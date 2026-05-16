import { useEffect, useRef, useState, useCallback } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, config: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

interface TurnstileProps {
  siteKey: string;
  onSuccess?: (token: string) => void;
  onError?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact" | "flexible";
  className?: string;
}

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js";
const LOAD_TIMEOUT_MS = 10000;
const RETRY_DELAY_MS = 3000;
const MAX_RETRIES = 2;

let _scriptLoadingPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (_scriptLoadingPromise) return _scriptLoadingPromise;

  _scriptLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (existing) {
      const poll = setInterval(() => {
        if (window.turnstile) {
          clearInterval(poll);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(poll);
        if (!window.turnstile) reject(new Error("Turnstile init timeout"));
        else resolve();
      }, LOAD_TIMEOUT_MS);
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Turnstile script"));
    document.head.appendChild(script);
  });

  return _scriptLoadingPromise;
}

export function Turnstile({
  siteKey,
  onSuccess,
  onError,
  theme = "auto",
  size = "normal",
  className = "",
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const mountedRef = useRef(false);
  const retryCountRef = useRef(0);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Use refs for callbacks to avoid stale closures and re-render loops
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Keep refs updated without causing re-render loops
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  const cleanup = useCallback(() => {
    mountedRef.current = false;
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // Already removed
      }
      widgetIdRef.current = null;
    }
  }, []);

  const renderWidget = useCallback(() => {
    if (!mountedRef.current || !containerRef.current || !window.turnstile) return false;

    try {
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Already removed
        }
        widgetIdRef.current = null;
      }

      const widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme,
        size,
        callback: (token: string) => {
          if (mountedRef.current) onSuccessRef.current?.(token);
        },
        "error-callback": () => {
          if (!mountedRef.current) return;
          setError(true);
          setErrorMsg("Security check failed. Please try again.");
          onErrorRef.current?.();
        },
        "timeout-callback": () => {
          if (!mountedRef.current) return;
          setError(true);
          setErrorMsg("Security check timed out. Please refresh.");
          onErrorRef.current?.();
        },
      });

      widgetIdRef.current = widgetId;
      setLoading(false);
      setError(false);
      return true;
    } catch {
      return false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, theme, size]);

  const attemptLoad = useCallback(() => {
    if (!mountedRef.current) return;

    if (retryCountRef.current >= MAX_RETRIES) {
      setError(true);
      setErrorMsg("Security check unavailable. Please refresh.");
      setLoading(false);
      onErrorRef.current?.();
      return;
    }

    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);

    loadTurnstileScript()
      .then(() => {
        if (!mountedRef.current) return;
        if (loadingTimerRef.current) {
          clearTimeout(loadingTimerRef.current);
          loadingTimerRef.current = null;
        }
        const ok = renderWidget();
        if (!ok) {
          retryCountRef.current++;
          setTimeout(attemptLoad, RETRY_DELAY_MS);
        }
      })
      .catch(() => {
        if (!mountedRef.current) return;
        retryCountRef.current++;
        _scriptLoadingPromise = null;
        setTimeout(attemptLoad, RETRY_DELAY_MS);
      });

    loadingTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        retryCountRef.current++;
        _scriptLoadingPromise = null;
        attemptLoad();
      }
    }, LOAD_TIMEOUT_MS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderWidget]);

  useEffect(() => {
    mountedRef.current = true;
    attemptLoad();
    return cleanup;
  }, [attemptLoad, cleanup]);

  if (error) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="text-sm text-destructive">{errorMsg}</div>
        <button
          type="button"
          onClick={() => {
            setError(false);
            setLoading(true);
            setErrorMsg("");
            retryCountRef.current = 0;
            _scriptLoadingPromise = null;
            cleanup();
            mountedRef.current = true;
            attemptLoad();
          }}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
        >
          Retry security check
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      {loading && (
        <div className="text-sm text-muted-foreground animate-pulse">Loading security check...</div>
      )}
      <div ref={containerRef} />
    </div>
  );
}
