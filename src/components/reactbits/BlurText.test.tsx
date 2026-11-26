import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LazyMotion, domMax } from "framer-motion";
import BlurText from "./BlurText";

describe("BlurText under <LazyMotion features={domMax} strict>", () => {
  const originalIO = globalThis.IntersectionObserver;

  beforeEach(() => {
    class MockIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = "0px";
      readonly thresholds = [0];
      constructor(private callback: IntersectionObserverCallback) {}
      observe = (target: Element) => {
        this.callback(
          [{ isIntersecting: true, target, intersectionRatio: 1 } as IntersectionObserverEntry],
          this as unknown as globalThis.IntersectionObserver,
        );
      };
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = () => [];
    }
    globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    globalThis.IntersectionObserver = originalIO;
  });

  it("renders trigger='load' without throwing a LazyMotion strict invariant error", () => {
    expect(process.env.NODE_ENV).not.toBe("production");
    expect(() =>
      render(
        <LazyMotion features={domMax} strict>
          <BlurText text="Innovate Create Disrupt" trigger="load" animateBy="words" />
        </LazyMotion>,
      ),
    ).not.toThrow();

    expect(screen.getByText("Innovate Create Disrupt")).toHaveClass("sr-only");
  });

  it("renders trigger='view' and focusOnHover without throwing under strict LazyMotion", () => {
    expect(() =>
      render(
        <LazyMotion features={domMax} strict>
          <BlurText
            text="Empowering students"
            trigger="view"
            animateBy="letters"
            effect="focus"
            focusOnHover
          />
        </LazyMotion>,
      ),
    ).not.toThrow();

    expect(screen.getByText("Empowering students")).toHaveClass("sr-only");
  });
});
