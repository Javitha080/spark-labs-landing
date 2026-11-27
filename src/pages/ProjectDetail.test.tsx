import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
  },
}));

vi.mock("@/components/Header", () => ({ default: () => <header data-testid="header" /> }));
vi.mock("@/components/Footer", () => ({ default: () => <footer data-testid="footer" /> }));
vi.mock("@/components/reactbits/TiltedCard", () => ({ default: () => <div /> }));
vi.mock("@/components/common/SocialShare", () => ({ default: () => <div /> }));

import ProjectDetail from "./ProjectDetail";

describe("ProjectDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Project Not Found immediately instead of spinning forever on an invalid UUID", () => {
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={["/project/not-a-valid-uuid"]}>
          <Routes>
            <Route path="/project/:id" element={<ProjectDetail />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>,
    );

    expect(screen.getByRole("heading", { name: /project not found/i })).toBeInTheDocument();
  });
});
