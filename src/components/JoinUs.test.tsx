import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LazyMotion, domAnimation } from "framer-motion";
import JoinUs from "./JoinUs";

const mockToast = vi.fn();
let mockResolvedTheme = "dark";
let lastTurnstileTheme: string | undefined;

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: mockResolvedTheme }),
}));

vi.mock("@/components/Turnstile", () => ({
  Turnstile: ({
    onSuccess,
    onError,
    theme,
    size,
  }: {
    onSuccess?: (token: string) => void;
    onError?: () => void;
    theme?: string;
    size?: string;
  }) => {
    lastTurnstileTheme = theme;
    return (
      <div data-testid="turnstile-mock" data-theme={theme} data-size={size}>
        <button type="button" onClick={() => onSuccess?.("valid-turnstile-token")}>
          Solve Turnstile
        </button>
        <button type="button" onClick={() => onError?.()}>
          Fail Turnstile
        </button>
      </div>
    );
  },
}));

// jsdom does not implement scrollIntoView, IntersectionObserver, or ResizeObserver
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = class IntersectionObserver {
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
    unobserve = () => {};
    disconnect = () => {};
    takeRecords = () => [];
  } as unknown as typeof IntersectionObserver;
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe = () => {};
    unobserve = () => {};
    disconnect = () => {};
  };
}

function renderJoinUs(props: { omitSectionId?: boolean } = {}) {
  return render(
    <LazyMotion features={domAnimation} strict>
      <MemoryRouter>
        <JoinUs {...props} />
      </MemoryRouter>
    </LazyMotion>,
  );
}

async function fillValidJoinForm() {
  fireEvent.change(screen.getByLabelText(/full name/i), {
    target: { value: "Amaya Silva" },
  });

  // Select Grade via Radix Select trigger
  fireEvent.click(document.getElementById("join-grade-trigger")!);
  fireEvent.click(await screen.findByRole("option", { name: "Grade 10" }));

  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: { value: "amaya@example.com" },
  });
  fireEvent.change(screen.getByLabelText(/phone number/i), {
    target: { value: "0771234567" },
  });

  // Select Interest Area via Radix Select trigger
  fireEvent.click(document.getElementById("join-interest-trigger")!);
  fireEvent.click(await screen.findByRole("option", { name: "Robotics" }));

  fireEvent.change(screen.getByLabelText(/why do you want to join/i), {
    target: { value: "I want to build autonomous solar robots with the team." },
  });

  // Consent checkbox & Turnstile
  fireEvent.click(document.getElementById("join-consent")!);
  fireEvent.click(screen.getByRole("button", { name: "Solve Turnstile" }));
}

describe("JoinUs", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    mockToast.mockReset();
    mockResolvedTheme = "dark";
    lastTurnstileTheme = undefined;
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("renders unique #join-* DOM IDs, marks reason as required, and syncs Turnstile theme", () => {
    mockResolvedTheme = "light";
    renderJoinUs();

    expect(document.getElementById("join-name")).toBeInTheDocument();
    expect(document.getElementById("join-grade-trigger")).toBeInTheDocument();
    expect(document.getElementById("join-email")).toBeInTheDocument();
    expect(document.getElementById("join-phone")).toBeInTheDocument();
    expect(document.getElementById("join-interest-trigger")).toBeInTheDocument();
    expect(document.getElementById("join-reason")).toBeInTheDocument();
    expect(document.getElementById("join-consent")).toBeInTheDocument();

    // No generic colliding IDs
    expect(document.getElementById("name")).toBeNull();
    expect(document.getElementById("email")).toBeNull();

    // Reason label is required (*), not (Optional)
    const reasonLabel = screen.getByText(/why do you want to join\?/i);
    expect(reasonLabel.textContent).toContain("*");
    expect(reasonLabel.textContent).not.toMatch(/optional/i);

    expect(lastTurnstileTheme).toBe("light");
    expect(screen.getByTestId("turnstile-mock")).toHaveAttribute("data-theme", "light");
  });

  it("rejects 9-character phone numbers and short reasons client-side without calling fetch", async () => {
    renderJoinUs();

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "Amaya Silva" },
    });
    fireEvent.click(document.getElementById("join-grade-trigger")!);
    fireEvent.click(await screen.findByRole("option", { name: "Grade 10" }));
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "amaya@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/phone number/i), {
      target: { value: "077123456" }, // 9 chars
    });
    fireEvent.click(document.getElementById("join-interest-trigger")!);
    fireEvent.click(await screen.findByRole("option", { name: "Robotics" }));
    fireEvent.change(screen.getByLabelText(/why do you want to join/i), {
      target: { value: "Too short" }, // 9 chars
    });
    fireEvent.click(document.getElementById("join-consent")!);
    fireEvent.click(screen.getByRole("button", { name: "Solve Turnstile" }));

    fireEvent.submit(document.getElementById("join-name")!.closest("form")!);

    expect(
      await screen.findByText("Phone number must be at least 10 characters"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/at least 10 characters\)/i),
    ).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("submits valid enrollment through POST /api/enroll and resets on 201", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, id: "enr-1" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderJoinUs({ omitSectionId: true });
    expect(document.getElementById("join")).toBeNull();

    await fillValidJoinForm();
    fireEvent.submit(document.getElementById("join-name")!.closest("form")!);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(url).toBe("/api/enroll");
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>)["X-Turnstile-Token"]).toBe(
      "valid-turnstile-token",
    );
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({
      name: "Amaya Silva",
      email: "amaya@example.com",
      phone: "0771234567",
      grade: "Grade 10",
      interest: "robotics",
      reason: "I want to build autonomous solar robots with the team.",
      consent_given: true,
      privacy_policy_version: "v1.0_2025-01-22",
      turnstileToken: "valid-turnstile-token",
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Application Submitted!",
        }),
      );
    });
    expect(screen.getByLabelText(/full name/i)).toHaveValue("");
  });

  it("handles 409 duplicate email and 429 rate limit responses from POST /api/enroll", async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: "An enrollment with this email already exists." }),
          { status: 409, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: "Too many enrollment attempts for this email. Please try again later." }),
          { status: 429, headers: { "Content-Type": "application/json" } },
        ),
      );

    renderJoinUs();
    await fillValidJoinForm();
    fireEvent.submit(document.getElementById("join-name")!.closest("form")!);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Already Registered",
          description: "An enrollment with this email already exists.",
          variant: "destructive",
        }),
      );
    });

    // Solve fresh Turnstile and submit again for 429
    fireEvent.click(screen.getByRole("button", { name: "Solve Turnstile" }));
    fireEvent.submit(document.getElementById("join-name")!.closest("form")!);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Please Wait",
          description:
            "Too many enrollment attempts for this email. Please try again later.",
          variant: "destructive",
        }),
      );
    });
  });

  it("uses compact Turnstile below 480px and never resurrects a stale token across double resize", () => {
    const originalMatchMedia = window.matchMedia;
    let isCompact = false;
    const listeners = new Set<() => void>();

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: query === "(max-width: 479px)" ? isCompact : false,
        media: query,
        onchange: null,
        addListener: (cb: () => void) => {
          if (query === "(max-width: 479px)") listeners.add(cb);
        },
        removeListener: (cb: () => void) => {
          listeners.delete(cb);
        },
        addEventListener: (_event: string, cb: () => void) => {
          if (query === "(max-width: 479px)") listeners.add(cb);
        },
        removeEventListener: (_event: string, cb: () => void) => {
          listeners.delete(cb);
        },
        dispatchEvent: () => false,
      }),
    });

    try {
      renderJoinUs();
      expect(screen.getByTestId("turnstile-mock")).toHaveAttribute("data-size", "normal");

      fireEvent.click(document.getElementById("join-consent")!);
      fireEvent.click(screen.getByRole("button", { name: "Solve Turnstile" }));
      const submitBtn = screen.getByRole("button", { name: /start your innovation journey/i });
      expect(submitBtn).toBeEnabled();

      // Cross below 480px -> compact widget mounts, solved token cleared
      act(() => {
        isCompact = true;
        listeners.forEach((cb) => cb());
      });
      expect(screen.getByTestId("turnstile-mock")).toHaveAttribute("data-size", "compact");
      expect(submitBtn).toBeDisabled();

      // Cross back above 480px without solving -> stale token must NOT resurrect
      act(() => {
        isCompact = false;
        listeners.forEach((cb) => cb());
      });
      expect(screen.getByTestId("turnstile-mock")).toHaveAttribute("data-size", "normal");
      expect(submitBtn).toBeDisabled();
    } finally {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: originalMatchMedia,
      });
    }
  });
});
