import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GamificationProvider, useGamification } from "./GamificationContext";

let mockAuthState = {
  student: null as { authUserId: string } | null,
  isAuthenticated: false,
  loading: true,
};

const statsQueries: string[] = [];
const achievementQueries: string[] = [];

vi.mock("./StudentAuthContext", () => ({
  useStudentSession: () => mockAuthState,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      const chain: Record<string, unknown> = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => {
          achievementQueries.push(table);
          return Promise.resolve({ data: [], error: null });
        }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        maybeSingle: vi.fn().mockImplementation(async () => {
          statsQueries.push(table);
          return { data: { user_id: "user-1", total_xp: 120, current_streak_days: 3 }, error: null };
        }),
      };
      return chain;
    }),
  },
  getSharedSession: vi.fn().mockResolvedValue({
    data: { session: { user: { id: "user-1" } } },
  }),
}));

vi.mock("@/lib/errors", () => ({
  logError: vi.fn(),
}));

describe("GamificationContext", () => {
  beforeEach(() => {
    statsQueries.length = 0;
    achievementQueries.length = 0;
    mockAuthState = {
      student: null,
      isAuthenticated: false,
      loading: true,
    };
  });

  it("waits for authLoading and fetches stats/achievements once without mount double-fetch", async () => {
    let addXpFn: ((pts: number) => Promise<void>) | null = null;

    function Probe() {
      const { stats, loading, addXp } = useGamification();
      addXpFn = addXp;
      return <div data-testid="xp">{loading ? "loading" : stats?.total_xp ?? 0}</div>;
    }

    const { rerender } = render(
      <GamificationProvider>
        <Probe />
      </GamificationProvider>
    );

    // While authLoading is true, zero queries fire
    expect(statsQueries).toHaveLength(0);
    expect(achievementQueries).toHaveLength(0);

    // Auth resolves
    mockAuthState = {
      student: { authUserId: "user-1" },
      isAuthenticated: true,
      loading: false,
    };
    rerender(
      <GamificationProvider>
        <Probe />
      </GamificationProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("xp").textContent).toBe("120");
    });
    expect(statsQueries).toHaveLength(1);
    expect(achievementQueries).toHaveLength(1);

    // addXp uses fetchStatsOnly (no extra learning_achievements query)
    const achBefore = achievementQueries.length;
    await act(async () => {
      await addXpFn?.(20);
    });
    expect(achievementQueries).toHaveLength(achBefore);
  });
});
