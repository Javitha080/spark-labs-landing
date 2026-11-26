import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

describe("useOnlineStatus", () => {
  const originalFetch = globalThis.fetch;
  const originalHref = window.location.href;

  const setTestUrl = (url: string) => {
    (window as unknown as { jsdom?: { reconfigure: (opts: { url: string }) => void } }).jsdom?.reconfigure({
      url,
    });
  };

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    setTestUrl("https://dvpyic.dpdns.org/");
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
    setTestUrl(originalHref);
  });

  it("pings /manifest.json?_cb= instead of / and handles offline debounce + recovery", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    globalThis.fetch = fetchMock;

    const { useOnlineStatus } = await import("./useOnlineStatus");
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.isOnline).toBe(true);

    // Advance past 120s poll interval
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });

    expect(fetchMock).toHaveBeenCalled();
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toMatch(/^\/manifest\.json\?_cb=\d+$/);
    expect(calledUrl).not.toMatch(/^\/\?_cb=/);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "HEAD", cache: "no-store" });

    // Simulate offline transition: debounce 3s + verify connectivity drops to offline
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current.isOnline).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_100);
    });
    expect(result.current.isOnline).toBe(false);

    // Simulate recovery
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    await act(async () => {
      window.dispatchEvent(new Event("online"));
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(result.current.isOnline).toBe(true);
  });
});
