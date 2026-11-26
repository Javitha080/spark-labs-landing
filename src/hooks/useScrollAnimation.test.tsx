import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScrollAnimation } from "./useScrollAnimation";

function Probe({ watchdogMs = 200 }: { watchdogMs?: number }) {
  const { ref, isVisible, hasAnimated } = useScrollAnimation({ watchdogMs });
  return (
    <div ref={ref} data-testid="probe" data-visible={String(isVisible)} data-animated={String(hasAnimated)} />
  );
}

describe("useScrollAnimation", () => {
  const originalIO = globalThis.IntersectionObserver;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.IntersectionObserver = originalIO;
  });

  it("reveals element via viewport watchdog when IntersectionObserver does not fire", async () => {
    globalThis.IntersectionObserver = class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    } as unknown as typeof IntersectionObserver;

    render(<Probe watchdogMs={250} />);
    const el = screen.getByTestId("probe");
    el.getBoundingClientRect = () => ({
      top: 100,
      bottom: 200,
      left: 0,
      right: 100,
      width: 100,
      height: 100,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    });

    expect(el.getAttribute("data-visible")).toBe("false");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(el.getAttribute("data-visible")).toBe("true");
    expect(el.getAttribute("data-animated")).toBe("true");
  });

  it("does not prematurely reveal far below-the-fold elements", async () => {
    globalThis.IntersectionObserver = class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    } as unknown as typeof IntersectionObserver;

    render(<Probe watchdogMs={200} />);
    const el = screen.getByTestId("probe");
    el.getBoundingClientRect = () => ({
      top: 5000,
      bottom: 5200,
      left: 0,
      right: 100,
      width: 100,
      height: 200,
      x: 0,
      y: 5000,
      toJSON: () => ({}),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    expect(el.getAttribute("data-visible")).toBe("false");
  });
});
