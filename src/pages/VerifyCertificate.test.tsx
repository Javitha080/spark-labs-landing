import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import VerifyCertificate from "./VerifyCertificate";

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: rpcMock },
}));

// The page is about the lookup result, not the chrome around it.
vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
vi.mock("@/components/SEOHead", () => ({ default: () => null }));
vi.mock("@/lib/errors", () => ({ logError: () => {} }));

const CERTIFICATE = {
  certificate_code: "YIC-1A2B3C4D5E6F-1026",
  student_name: "Asha Perera",
  course_title: "Intro to Robotics",
  course_slug: "intro-to-robotics",
  issued_at: "2026-10-01T10:00:00.000Z",
  revoked_at: null as string | null,
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/verify" element={<VerifyCertificate />} />
        <Route path="/verify/:code" element={<VerifyCertificate />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  rpcMock.mockReset();
});

describe("VerifyCertificate", () => {
  it("shows the holder, course and ID for a valid code", async () => {
    rpcMock.mockResolvedValue({ data: [CERTIFICATE], error: null });

    renderAt("/verify/YIC-1A2B3C4D5E6F-1026");

    expect(await screen.findByRole("heading", { name: "Valid certificate" })).toBeInTheDocument();
    expect(screen.getByText("Asha Perera")).toBeInTheDocument();
    expect(screen.getByText("Intro to Robotics")).toBeInTheDocument();
    expect(screen.getByText("YIC-1A2B3C4D5E6F-1026")).toBeInTheDocument();
    expect(rpcMock).toHaveBeenCalledWith("verify_certificate", { p_code: "YIC-1A2B3C4D5E6F-1026" });
  });

  it("calls out a revoked certificate instead of calling it valid", async () => {
    rpcMock.mockResolvedValue({
      data: [{ ...CERTIFICATE, revoked_at: "2026-10-15T00:00:00.000Z" }],
      error: null,
    });

    renderAt("/verify/YIC-1A2B3C4D5E6F-1026");

    expect(await screen.findByRole("heading", { name: "Certificate revoked" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Valid certificate" })).not.toBeInTheDocument();
  });

  it("reports an unknown code as not found", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    renderAt("/verify/YIC-000000000000-0000");

    expect(await screen.findByRole("heading", { name: "No certificate matches that ID" })).toBeInTheDocument();
  });

  it("distinguishes a failed lookup from a missing certificate", async () => {
    rpcMock.mockResolvedValue({ data: null, error: new Error("offline") });

    renderAt("/verify/YIC-1A2B3C4D5E6F-1026");

    expect(await screen.findByRole("heading", { name: "Couldn't reach the registry" })).toBeInTheDocument();
  });

  it("looks up a code typed into the form", async () => {
    rpcMock.mockResolvedValue({ data: [CERTIFICATE], error: null });

    renderAt("/verify");
    fireEvent.change(screen.getByLabelText("Certificate ID"), {
      target: { value: "  yic-aaaabbbbcccc-1026 " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() =>
      expect(rpcMock).toHaveBeenCalledWith("verify_certificate", { p_code: "YIC-AAAABBBBCCCC-1026" }),
    );
  });
});
