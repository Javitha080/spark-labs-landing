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

/**
 * Cloudflare Turnstile widget component.
 * Provides bot protection for forms without CAPTCHA friction.
 * Includes retry logic, timeout handling, and graceful degradation.
 */
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
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // Widget may already be removed
      }
      widgetIdRef.current = null;
    }
  }, []);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile) {
      return false;
    }

    try {
      if (widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
      }

      const widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme,
        size,
        callback: (token: string) => {
          onSuccess?.(token);
        },
        "error-callback": () => {
          setError(true);
          setErrorMsg("Security check failed. Please try again.");
          onError?.();
        },
        "expired-callback": () => {
          setError(false);
          setLoading(false);
        },
        "timeout-callback": () => {
          setError(true);
          setErrorMsg("Security check timed out. Please try again.");
          onError?.();
        },
      });

      widgetIdRef.current = widgetId;
      setLoading(false);
      setError(false);
      return true;
    } catch {
      return false;
    }
  }, [siteKey, theme, size, onSuccess, onError]);

  const loadScript = useCallback(() => {
    if (window.turnstile) {
      renderWidget();
      return;
    }

    if (scriptRef.current) {
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      const rendered = renderWidget();
      if (!rendered && retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        setTimeout(loadScript, RETRY_DELAY_MS);
      } else if (!rendered) {
        setError(true);
        setErrorMsg("Unable to load security check.");
        setLoading(false);
        onError?.();
      }
    };

    script.onerror = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        scriptRef.current = null;
        setTimeout(loadScript, RETRY_DELAY_MS);
      } else {
        setError(true);
        setErrorMsg("Security check unavailable. Please refresh the page.");
        setLoading(false);
        onError?.();
      }
    };

    scriptRef.current = script;
    document.head.appendChild(script);

    timeoutRef.current = setTimeout(() => {
      if (loading && !window.turnstile) {
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          if (scriptRef.current && scriptRef.current.parentNode) {
            scriptRef.current.parentNode.removeChild(scriptRef.current);
          }
          scriptRef.current = null;
          loadScript();
        } else {
          setError(true);
          setErrorMsg("Security check timed out. Please refresh the page.");
          setLoading(false);
          onError?.();
        }
      }
    }, LOAD_TIMEOUT_MS);
  }, [loading, renderWidget, onError]);

  const handleRetry = useCallback(() => {
    setError(false);
    setLoading(true);
    setErrorMsg("");
    retryCountRef.current = 0;
    cleanup();
    loadScript();
  }, [cleanup, loadScript]);

  useEffect(() => {
    loadScript();
    return cleanup;
  }, [loadScript, cleanup]);

  if (error) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="text-sm text-destructive">{errorMsg}</div>
        <button
          type="button"
          onClick={handleRetry}
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
