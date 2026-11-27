import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CommandPalette from "./CommandPalette";

const navigateMock = vi.fn();
const setThemeMock = vi.fn();
const prefetchRouteMock = vi.fn();
const scrollToTargetMock = vi.fn();
const scrollToTopMock = vi.fn();

let mockRole: "admin" | "editor" | null = null;
let mockCanAccessCMS = false;
let mockIsAuthenticated = false;

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("next-themes", () => ({
  useTheme: () => ({
    resolvedTheme: "dark",
    setTheme: setThemeMock,
  }),
}));

vi.mock("@/contexts/RoleContext", () => ({
  useRole: () => ({
    role: mockRole,
    canAccessCMS: () => mockCanAccessCMS,
  }),
}));

vi.mock("@/context/StudentAuthContext", () => ({
  useStudentSession: () => ({
    isAuthenticated: mockIsAuthenticated,
  }),
}));

vi.mock("@/lib/prefetch", () => ({
  prefetchRoute: (...args: unknown[]) => prefetchRouteMock(...args),
}));

vi.mock("@/lib/scroll", () => ({
  scrollToTarget: (...args: unknown[]) => scrollToTargetMock(...args),
  scrollToTop: (...args: unknown[]) => scrollToTopMock(...args),
}));

vi.mock("@/lib/edgeApi", () => ({
  fetchWithFallback: vi.fn(async (endpoint: string) => {
    if (endpoint === "/api/blog/posts") {
      return {
        data: [
          {
            id: "b1",
            title: "Solar Rover Robotics Build",
            slug: "solar-rover-robotics-build",
            category: "Engineering",
            excerpt: "Autonomous rover guide",
          },
          {
            id: "id-with\nnewline",
            title: "Special Newline Post",
            slug: "special-newline-post",
            category: "Engineering",
            excerpt: "Selector safety check",
          },
          {
            id: "n1",
            title: "Annual Science Fair Winners",
            slug: "annual-science-fair-winners",
            category: "News",
            excerpt: "Club results",
          },
        ],
        fromEdge: true,
      };
    }
    if (endpoint === "/api/projects") {
      return {
        data: [{ id: "p1", title: "Smart Irrigation IoT", category: "IoT" }],
        fromEdge: true,
      };
    }
    if (endpoint === "/api/events") {
      return {
        data: [
          {
            id: "e1",
            title: "Arduino BootCamp 2026",
            event_date: "2026-06-15",
            location: "Innovation Lab",
          },
        ],
        fromEdge: true,
      };
    }
    return { data: [], fromEdge: false };
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: async () => ({
              data: [
                {
                  id: "c1",
                  title: "Intro to Embedded Robotics",
                  slug: "intro-embedded-robotics",
                  category: "Robotics",
                  level: "Beginner",
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    }),
  },
}));

function renderPalette(open: boolean, onOpenChange = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return {
    onOpenChange,
    ...render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/about"]}>
          <CommandPalette open={open} onOpenChange={onOpenChange} />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}

describe("CommandPalette", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    setThemeMock.mockReset();
    prefetchRouteMock.mockReset();
    scrollToTargetMock.mockReset();
    scrollToTopMock.mockReset();
    mockRole = null;
    mockCanAccessCMS = false;
    mockIsAuthenticated = false;
  });

  it("renders nothing when closed and shows Lenis-protected results when open", async () => {
    const { rerender } = renderPalette(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    rerender(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/about"]}>
          <CommandPalette open onOpenChange={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("data-lenis-prevent");

    const listbox = screen.getByRole("listbox", { name: "Command palette results" });
    expect(listbox).toHaveAttribute("data-lenis-prevent");
    expect(listbox).toHaveAttribute("data-command-list");

    expect(await screen.findByText("Solar Rover Robotics Build")).toBeInTheDocument();
    expect(screen.getByText("Annual Science Fair Winners")).toBeInTheDocument();
    expect(screen.getByText("Smart Irrigation IoT")).toBeInTheDocument();
    expect(screen.getByText("Arduino BootCamp 2026")).toBeInTheDocument();
    expect(screen.getByText("Intro to Embedded Robotics")).toBeInTheDocument();
  });

  it("shows role-aware Admin CMS path and authenticated student links", async () => {
    mockRole = "editor";
    mockCanAccessCMS = true;
    mockIsAuthenticated = true;

    renderPalette(true);

    expect(await screen.findByText("Admin CMS")).toBeInTheDocument();
    expect(screen.getByText("Open CMS (/admin/events)")).toBeInTheDocument();
    expect(screen.getByText("Student Dashboard")).toBeInTheDocument();
    expect(screen.getByText("My Learning")).toBeInTheDocument();
  });

  it("filters results by query, handles keyboard navigation + Enter, and prefetches on hover", async () => {
    const onOpenChange = vi.fn();
    renderPalette(true, onOpenChange);

    await screen.findByText("Solar Rover Robotics Build");

    const input = screen.getByLabelText("Search commands and site content");
    fireEvent.change(input, { target: { value: "robotics" } });

    const options = screen.getAllByRole("option");
    expect(options.length).toBe(2);
    expect(options[0]).toHaveAttribute("aria-selected", "true");

    // Hover second option to verify prefetch
    fireEvent.mouseEnter(options[1]);
    expect(prefetchRouteMock).toHaveBeenCalledWith("/learning-hub/course/intro-embedded-robotics");

    // ArrowDown -> wraps/moves, ArrowUp -> back to 0, ArrowDown -> 1, Enter -> navigates
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(navigateMock).toHaveBeenCalledWith("/learning-hub/course/intro-embedded-robotics");
    });

    // Unmatched query renders empty state
    fireEvent.change(input, { target: { value: "zzzz-no-such-item" } });
    expect(screen.getByText(/No matches found/i)).toBeInTheDocument();
  });

  it("scrolls active item with newline in id when globalThis.CSS is undefined", async () => {
    const originalCss = globalThis.CSS;
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    const scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    try {
      Object.defineProperty(globalThis, "CSS", {
        value: undefined,
        configurable: true,
        writable: true,
      });

      renderPalette(true);
      await screen.findByText("Special Newline Post");

      const input = screen.getByLabelText("Search commands and site content");
      fireEvent.change(input, { target: { value: "Special Newline Post" } });

      const option = screen.getByRole("option", { name: /Special Newline Post/i });
      expect(option).toHaveAttribute("aria-selected", "true");
      expect(option).toHaveAttribute("data-command-item-id", "post-id-with\nnewline");
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ block: "nearest" });
    } finally {
      Object.defineProperty(globalThis, "CSS", {
        value: originalCss,
        configurable: true,
        writable: true,
      });
      Element.prototype.scrollIntoView = originalScrollIntoView;
    }
  });
});
