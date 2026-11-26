import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LazyMotion, domMax } from "framer-motion";
import Events from "./Events";

const mockScrollToTarget = vi.fn();

const mockEvents = [
  {
    id: "evt-featured",
    title: "Innovation Summit 2026",
    description: "Annual showcase of student robotics and AI prototypes.",
    event_date: "2026-06-15",
    event_time: "09:00 AM",
    location: "Main Auditorium",
    is_featured: true,
    category: "Flagship",
  },
  {
    id: "evt-upcoming-1",
    title: "Solar Rover Workshop",
    description: "Hands-on telemetry and solar drive prototyping.",
    event_date: "2026-07-10",
    event_time: "02:30 PM",
    location: "Innovation Lab",
    is_featured: false,
    category: "Workshop",
  },
];

vi.mock("@/lib/scroll", () => ({
  scrollToTarget: (target: string) => mockScrollToTarget(target),
}));

vi.mock("@/lib/motion", () => ({
  prefersReducedMotion: () => true,
}));

vi.mock("@/hooks/useRealtimeSync", () => ({
  useRealtimeSync: vi.fn(),
}));

vi.mock("@/lib/edgeApi", () => ({
  fetchWithFallback: vi.fn(async () => ({ data: mockEvents, source: "api" })),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: async () => ({
            data: [
              {
                id: "sch-1",
                title: "Robotics Build Session",
                description: "Weekly chassis and firmware lab.",
                day_of_week: "Wednesday",
                start_time: "03:00 PM",
                end_time: "05:00 PM",
                location: "STEM Lab",
                is_active: true,
              },
            ],
            error: null,
          }),
        }),
      }),
    }),
  },
}));

describe("Events", () => {
  const originalIO = globalThis.IntersectionObserver;
  const originalRO = globalThis.ResizeObserver;

  beforeEach(() => {
    mockScrollToTarget.mockReset();

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
    globalThis.IntersectionObserver = originalIO;
    globalThis.ResizeObserver = originalRO;
  });

  function renderEvents() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <LazyMotion features={domMax} strict>
          <Events />
        </LazyMotion>
      </QueryClientProvider>,
    );
  }

  it("aligns the ticker bleed wrapper with container-custom px-4 sm:px-6 without md overshoot", async () => {
    const { container } = renderEvents();

    await waitFor(() => {
      expect(screen.getByText(/innovation summit 2026/i)).toBeInTheDocument();
    });

    const containerEl = container.querySelector(".container-custom");
    expect(containerEl).toBeInTheDocument();
    expect(containerEl?.className).toContain("px-4");
    expect(containerEl?.className).toContain("sm:px-6");

    const tickerEl = container.querySelector(".events-blur-card");
    const tickerWrapper = tickerEl?.parentElement;
    expect(tickerWrapper).toBeInTheDocument();
    expect(tickerWrapper?.className).toContain("w-[calc(100%+2rem)]");
    expect(tickerWrapper?.className).toContain("sm:w-[calc(100%+3rem)]");
    expect(tickerWrapper?.className).toContain("-mx-4");
    expect(tickerWrapper?.className).toContain("sm:-mx-6");
    expect(tickerWrapper?.className).not.toContain("md:-mx-8");
    expect(tickerWrapper?.className).not.toContain("md:w-[calc(100%+4rem)]");
  });

  it("preserves mobile rail/dot alignment classes, register CTA scroll, and event details dialog", async () => {
    const { container } = renderEvents();

    await waitFor(() => {
      expect(screen.getByText(/solar rover workshop/i)).toBeInTheDocument();
    });

    const rail = container.querySelector(".bg-gradient-to-b.from-primary.to-transparent");
    expect(rail?.className).toContain("left-[6px]");
    expect(rail?.className).toContain("sm:left-[8px]");
    expect(rail?.className).toContain("-translate-x-1/2");

    const dot = container.querySelector(".-left-\\[34px\\]");
    expect(dot).toBeInTheDocument();
    expect(dot?.className).toContain("sm:-left-[40px]");
    expect(dot?.className).toContain("-translate-x-1/2");

    fireEvent.click(screen.getByRole("button", { name: /register now/i }));
    expect(mockScrollToTarget).toHaveBeenCalledWith("join");

    fireEvent.click(screen.getByRole("button", { name: /event details/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const dialogRegisterBtns = screen.getAllByRole("button", { name: /register now/i });
    fireEvent.click(dialogRegisterBtns[dialogRegisterBtns.length - 1]);
    expect(mockScrollToTarget).toHaveBeenCalledTimes(2);
    expect(mockScrollToTarget).toHaveBeenLastCalledWith("join");
  });
});
