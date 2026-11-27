import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initWebVitals, reportClientError, resetTelemetrySessionForTest } from "./telemetry";

describe("telemetry", () => {
  const originalHref = window.location.href;
  const originalSendBeacon = navigator.sendBeacon;
  const originalPerformanceObserver = globalThis.PerformanceObserver;

  const setTestUrl = (url: string) => {
    (window as unknown as { jsdom?: { reconfigure: (opts: { url: string }) => void } }).jsdom?.reconfigure({
      url,
    });
  };

  beforeEach(() => {
    resetTelemetrySessionForTest();
    vi.unstubAllEnvs();
    setTestUrl("https://dvpyic.dpdns.org/blog");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    setTestUrl(originalHref);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: originalSendBeacon,
    });
    globalThis.PerformanceObserver = originalPerformanceObserver;
  });

  it("no-ops in non-production environments", () => {
    const beaconMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: beaconMock });
    vi.stubEnv("PROD", false);

    reportClientError(new Error("boom"));
    const cleanup = initWebVitals(1);
    expect(beaconMock).not.toHaveBeenCalled();
    cleanup();
  });

  it("unwraps { error, info }, strips PII, deduplicates, and sends via sendBeacon in prod", async () => {
    const beaconMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: beaconMock });
    vi.stubEnv("PROD", true);

    const err = new Error("Failed for user@example.com?token=secret123 Bearer abc.def.ghi");
    reportClientError({ error: err, info: { componentStack: "<App>" } }, { boundary: "RouteErrorBoundary" });
    // Duplicate is suppressed
    reportClientError({ error: err, info: {} }, { boundary: "RouteErrorBoundary" });

    expect(beaconMock).toHaveBeenCalledTimes(1);
    expect(beaconMock.mock.calls[0][0]).toBe("/api/telemetry");
    const blob = beaconMock.mock.calls[0][1] as Blob;
    const payload = JSON.parse(await blob.text());
    expect(payload.kind).toBe("error");
    expect(payload.message).not.toContain("user@example.com");
    expect(payload.message).not.toContain("secret123");
    expect(payload.message).not.toContain("abc.def.ghi");
    expect(payload.path).toBe("/blog");
  });

  it("observes Web Vitals, flushes on pagehide, and disconnects observers on cleanup", async () => {
    const beaconMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: beaconMock });
    vi.stubEnv("PROD", true);

    const disconnected: number[] = [];
    const callbacks = new Map<string, PerformanceObserverCallback>();

    globalThis.PerformanceObserver = class {
      private type = "";
      constructor(cb: PerformanceObserverCallback) {
        this.cb = cb;
      }
      private cb: PerformanceObserverCallback;
      observe(opts: PerformanceObserverInit) {
        this.type = opts.type || "";
        callbacks.set(this.type, this.cb);
      }
      disconnect() {
        disconnected.push(1);
      }
    } as unknown as typeof PerformanceObserver;

    const cleanup = initWebVitals(1);
    const lcpCb = callbacks.get("largest-contentful-paint");
    lcpCb?.(
      { getEntries: () => [{ startTime: 1234 }] } as unknown as PerformanceObserverEntryList,
      {} as PerformanceObserver
    );

    window.dispatchEvent(new Event("pagehide"));
    expect(beaconMock).toHaveBeenCalledTimes(1);
    const blob = beaconMock.mock.calls[0][1] as Blob;
    const payload = JSON.parse(await blob.text());
    expect(payload.kind).toBe("vitals");
    expect(payload.metrics.LCP).toBe(1234);

    cleanup();
    expect(disconnected.length).toBeGreaterThan(0);
  });
});
