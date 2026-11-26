import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LazyMotion, domMax } from "framer-motion";
import { MemoryRouter } from "react-router-dom";
import Hero from "./Hero";
import FAQ from "./FAQ";
import Testimonials from "./Testimonials";
import About from "@/components/About";
import Impact from "@/components/Impact";
import CircularText from "@/components/reactbits/CircularText";
import DecryptedText from "@/components/reactbits/DecryptedText";
import ScrollVelocity from "@/components/reactbits/ScrollVelocity";
import { AIStatusOrb } from "@/components/rareui/AIStatusOrb";
import PageTransition from "@/components/animation/PageTransition";
import { FadeInOnScroll, StaggerChildren, StaggerItem } from "@/components/animation/ScrollAnimations";
import { markBooted } from "@/lib/boot";

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark" }),
}));

vi.mock("@/hooks/useLandingBlocks", () => ({
  useLandingBlocks: () => ({ blocks: {}, isLoading: false }),
}));

vi.mock("@/lib/scroll", () => ({
  scrollToTarget: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        limit: () => Promise.resolve({ count: 0, data: [], error: null }),
      }),
    }),
  },
}));

describe("M2 Landing Motion Components under <LazyMotion features={domMax} strict>", () => {
  const originalIO = globalThis.IntersectionObserver;
  const originalRO = globalThis.ResizeObserver;

  beforeEach(() => {
    sessionStorage.clear();
    markBooted();

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

    class MockResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }

    globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    sessionStorage.clear();
    globalThis.IntersectionObserver = originalIO;
    globalThis.ResizeObserver = originalRO;
  });

  it("renders booted Hero (including BlurText, RotatingText, CountUp, and m.* wrappers) without throwing", () => {
    expect(process.env.NODE_ENV).not.toBe("production");
    expect(() =>
      render(
        <LazyMotion features={domMax} strict>
          <Hero />
        </LazyMotion>,
      ),
    ).not.toThrow();

    expect(
      screen.getByText("Empowering the next generation of tech leaders at Dharmapala Vidyalaya Pannipitiya."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /join the club/i })).toBeInTheDocument();
  });

  it("renders all other M2 landing motion, ReactBits, Rare UI, and animation primitives cleanly under strict LazyMotion", () => {
    expect(() =>
      render(
        <LazyMotion features={domMax} strict>
          <MemoryRouter>
            <PageTransition>
              <FadeInOnScroll>
                <About />
                <Impact />
                <Testimonials />
                <FAQ />
                <StaggerChildren>
                  <StaggerItem>
                    <AIStatusOrb status="thinking" showLabel />
                  </StaggerItem>
                </StaggerChildren>
                <CircularText text="YIC • DVP • " />
                <DecryptedText text="STEM LABS" />
                <ScrollVelocity texts={["INNOVATE"]} />
              </FadeInOnScroll>
            </PageTransition>
          </MemoryRouter>
        </LazyMotion>,
      ),
    ).not.toThrow();
  });
});
