import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AtmospherePhysicsEngine } from "@/components/footer/atmospherePhysics";
import { AvianFlockPhysics } from "@/components/footer/avianFlockPhysics";
import { FallingLeafPhysics } from "@/components/footer/fallingLeafPhysics";
import {
  BIRD_STRIDE,
  LEAF_STRIDE,
  PhysicsWorkerBridge,
} from "@/components/footer/physicsWorkerBridge";
import {
  resolveQualityProfile,
  type DeviceCapabilities,
} from "@/components/footer/viharaCapabilities";
import Footer from "./Footer";

vi.mock("@/components/Turnstile", () => ({
  Turnstile: ({ onSuccess }: { onSuccess?: (token: string) => void }) => (
    <button
      type="button"
      data-testid="mock-turnstile"
      onClick={() => onSuccess?.("test-turnstile-token")}
    >
      Verify human
    </button>
  ),
}));

vi.mock("@/components/footer/ViharaAtmosphericSkyWebGL", () => ({
  default: () => <div data-testid="vihara-sky-webgl" />,
}));

vi.mock("@/components/footer/ViharaWebGLCanvas", () => ({
  default: () => <div data-testid="vihara-webgl-canvas" />,
}));

vi.mock("@/components/footer/ViharaSkyCanvas", () => ({
  default: () => <div data-testid="vihara-sky-canvas" />,
}));

function renderFooter() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark">
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("Footer (Vihara v3 Production-Hardened Upgrade)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the site footer landmark, uncropped grove artwork, navigation links, socials, and single Turnstile", () => {
    renderFooter();

    const footer = screen.getByRole("contentinfo", {
      name: /YICDVP Vihara living woodblock footer/i,
    });
    expect(footer).toHaveAttribute("data-site-footer");

    // Uncropped 1280x720 grove plate & 3-strata high clouds are present
    const plates = document.querySelectorAll('img[src="/assets/vihara-pavilion-fulltrees.webp"]');
    expect(plates.length).toBeGreaterThan(0);

    const cirrus = document.querySelectorAll('img[src="/assets/vihara-cloud-cirrus.webp"]');
    expect(cirrus.length).toBeGreaterThan(0);

    // Menu & Explore routes preserved
    expect(screen.getByRole("link", { name: "About us" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/projects");
    expect(screen.getByRole("link", { name: "STEM Learning Hub" })).toHaveAttribute(
      "href",
      "/learning-hub",
    );
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
      "href",
      "/privacy-policy",
    );
    expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute(
      "href",
      "/terms-of-service",
    );

    // Socials preserved
    expect(screen.getByRole("link", { name: "Facebook" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Instagram" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Youtube" })).toBeInTheDocument();

    // Single Turnstile widget mounted across desktop and mobile
    expect(screen.getAllByTestId("mock-turnstile")).toHaveLength(1);
  });

  it("submits newsletter subscription with Turnstile token and shows confirmation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderFooter();

    fireEvent.click(screen.getByTestId("mock-turnstile"));

    const emailInput = screen.getByLabelText("Email address");
    const submitBtn = screen.getByRole("button", { name: "Subscribe" });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.change(emailInput, { target: { value: "innovator@yicdvp.lk" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/You're on the list/i);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/newsletter-subscribe",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-Turnstile-Token": "test-turnstile-token",
        }),
        body: JSON.stringify({ email: "innovator@yicdvp.lk" }),
      }),
    );
  });

  it("supports interactive Gust, Atmosphere preset cycling, Engine Tier switching, and Pause/Resume controls", () => {
    renderFooter();

    // Gust trigger works without throwing
    fireEvent.click(screen.getByRole("button", { name: "Send sweeping wind gust" }));

    // Atmosphere cycles Morning Mist -> Golden Dusk -> Monsoon Breeze
    const atmoBtn = screen.getByRole("button", { name: /Switch sky atmosphere/i });
    expect(atmoBtn).toHaveAttribute("aria-label", expect.stringContaining("Morning Mist"));
    fireEvent.click(atmoBtn);
    expect(atmoBtn).toHaveAttribute("aria-label", expect.stringContaining("Golden Dusk"));
    fireEvent.click(atmoBtn);
    expect(atmoBtn).toHaveAttribute("aria-label", expect.stringContaining("Monsoon Breeze"));

    // Engine Tier cycles cleanly
    const tierBtn = screen.getByRole("button", { name: /Switch graphics engine tier/i });
    expect(tierBtn).toHaveAttribute("aria-label", expect.stringContaining("Auto"));
    fireEvent.click(tierBtn);
    expect(tierBtn).toHaveAttribute("aria-label", expect.not.stringContaining("Auto"));

    // Pause / Resume toggle works cleanly
    const pauseBtn = screen.getByRole("button", { name: "Pause footer animation" });
    fireEvent.click(pauseBtn);
    expect(screen.getByRole("button", { name: "Resume footer animation" })).toBeInTheDocument();
  });

  it("advances 6-body traveling-gust wind physics, falling leaves, boids, and packed WorkerBridge fallback", () => {
    const atm = new AtmospherePhysicsEngine();
    const flock = new AvianFlockPhysics();
    const leaves = new FallingLeafPhysics();

    expect(flock.birds.length).toBe(13);

    atm.triggerGust(1.85);
    atm.applyPointerImpulse(0.34, 0.5, 4.0);

    for (let i = 0; i < 180; i++) {
      const snap = atm.step(1 / 60, 1.2);
      flock.step(1 / 60, snap, 0.42, null, null);
      leaves.step(1 / 60, snap, 0.43, 1.2);
    }

    expect(atm.snapshot.simTime).toBeGreaterThan(2.9);
    expect(atm.snapshot.cloudAdvection).toBeGreaterThan(0.8);
    expect(Number.isFinite(atm.snapshot.leftTreeBend)).toBe(true);
    expect(Number.isFinite(atm.snapshot.leftPalmBend)).toBe(true);
    expect(Number.isFinite(atm.snapshot.rightPalmBend)).toBe(true);
    expect(Number.isFinite(atm.snapshot.rightTreeBend)).toBe(true);
    expect(Number.isFinite(atm.snapshot.hedgeRustle)).toBe(true);
    expect(leaves.leaves.length).toBeGreaterThan(0);

    // Every bird stays safely inside the open sky corridor above the uncropped tree crowns
    for (const bird of flock.birds) {
      expect(bird.y).toBeGreaterThan(0.01);
      expect(bird.y).toBeLessThan(0.45);
    }

    // Packed main-thread PhysicsWorkerBridge produces valid Float32Array snapshots
    const bridge = new PhysicsWorkerBridge({
      useWorker: false,
      maxBirds: 10,
      maxLeaves: 10,
      targetFps: 60,
      windMultiplier: 1.3,
      timeScale: 1,
      paused: false,
      skyBottomNorm: 0.42,
      groveTopNorm: 0.43,
      showLeaves: true,
    });

    bridge.triggerGust(1.8);
    let frame = bridge.step(1 / 60);
    for (let i = 0; i < 120; i++) {
      frame = bridge.step(1 / 60);
    }
    expect(frame.runningInWorker).toBe(false);
    expect(frame.birdCount).toBe(10);
    expect(frame.birdsBuffer.length).toBe(10 * BIRD_STRIDE);
    expect(frame.leavesBuffer.length).toBe(frame.leafCount * LEAF_STRIDE);
    bridge.dispose();
  });

  it("resolves adaptive GPU and CPU Eco quality profiles accurately from device capabilities", () => {
    const highEndDesktop: DeviceCapabilities = {
      hasWebGL2: true,
      hasWebGL1: true,
      isSoftwareRenderer: false,
      gpuRenderer: "ANGLE (NVIDIA RTX)",
      maxTextureSize: 16384,
      cpuCores: 8,
      deviceMemoryGB: 16,
      isMobile: false,
      isTouch: false,
      hasWorker: true,
      prefersReducedMotion: false,
      recommendedTier: "ultra",
    };

    const ultra = resolveQualityProfile("auto", highEndDesktop);
    expect(ultra.tier).toBe("ultra");
    expect(ultra.useWebGLSky).toBe(true);
    expect(ultra.useWebGLGrove).toBe(true);
    expect(ultra.maxBirds).toBe(13);

    const ecoForced = resolveQualityProfile("eco", highEndDesktop);
    expect(ecoForced.tier).toBe("eco");
    expect(ecoForced.useWebGLSky).toBe(false);
    expect(ecoForced.useWebGLGrove).toBe(false);

    // Browser lacking WebGL always stays in safe CPU Eco mode even if Ultra requested
    const noWebGL: DeviceCapabilities = {
      ...highEndDesktop,
      hasWebGL2: false,
      hasWebGL1: false,
      recommendedTier: "eco",
    };
    const safeEco = resolveQualityProfile("ultra", noWebGL);
    expect(safeEco.tier).toBe("eco");
    expect(safeEco.useWebGLGrove).toBe(false);
  });
});
