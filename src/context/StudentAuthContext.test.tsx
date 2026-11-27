import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  StudentAuthProvider,
  useStudentActions,
  useStudentSession,
} from "./StudentAuthContext";

const { tablesQueried, unsubscribeMock, mockSession } = vi.hoisted(() => ({
  tablesQueried: [] as string[],
  unsubscribeMock: vi.fn(),
  mockSession: {
    access_token: "tok-123",
    user: { id: "user-1", email: "student@example.com" },
  },
}));

const makeChain = (table: string) => {
  tablesQueried.push(table);
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    update: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    maybeSingle: vi.fn().mockImplementation(async () => {
      if (table === "profiles") return { data: { full_name: "Test Student" }, error: null };
      if (table === "student_accounts") {
        return {
          data: {
            id: "sa-1",
            auth_user_id: "user-1",
            email: "student@example.com",
            must_change_password: false,
            is_active: true,
            created_at: "2026-01-01T00:00:00Z",
          },
          error: null,
        };
      }
      return { data: null, error: null };
    }),
    single: vi.fn().mockResolvedValue({
      data: {
        id: "prog-1",
        user_id: "user-1",
        course_id: "course-1",
        module_id: "mod-1",
        is_completed: true,
        completed_at: "2026-11-21T00:00:00Z",
      },
      error: null,
    }),
    then: (resolve: (val: unknown) => void) => {
      if (table === "learning_enrollments") {
        return Promise.resolve(
          resolve({
            data: [
              {
                id: "enr-1",
                auth_user_id: "user-1",
                course_id: "course-1",
                progress: 50,
                completed_at: null,
              },
            ],
            error: null,
          })
        );
      }
      return Promise.resolve(resolve({ data: [], error: null }));
    },
  };
  return chain;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => makeChain(table)),
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: unsubscribeMock } },
      })),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
  getSharedSession: vi.fn().mockResolvedValue({ data: { session: mockSession } }),
}));

vi.mock("@/lib/errors", () => ({
  logError: vi.fn(),
}));

describe("StudentAuthContext", () => {
  beforeEach(() => {
    tablesQueried.length = 0;
  });

  it("isolates session consumers from updateModuleProgress and only refreshes learning_enrollments", async () => {
    let sessionRenders = 0;
    let updateFn: ((c: string, m: string, done: boolean) => Promise<void>) | null = null;

    function SessionSpy() {
      const { student, isAuthenticated } = useStudentSession();
      sessionRenders += 1;
      return <div data-testid="session">{isAuthenticated ? student?.name : "anon"}</div>;
    }

    function ActionTrigger() {
      const { updateModuleProgress } = useStudentActions();
      updateFn = updateModuleProgress;
      return null;
    }

    render(
      <StudentAuthProvider>
        <SessionSpy />
        <ActionTrigger />
      </StudentAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("session").textContent).toBe("Test Student");
    });

    const rendersAfterMount = sessionRenders;
    tablesQueried.length = 0;

    await act(async () => {
      await updateFn?.("course-1", "mod-1", true);
    });

    // Session consumer did NOT re-render when progress/enrollments updated
    expect(sessionRenders).toBe(rendersAfterMount);
    // updateModuleProgress refreshed only learning_enrollments (not 4-table profiles/student_accounts)
    expect(tablesQueried).toContain("learning_progress");
    expect(tablesQueried).toContain("learning_enrollments");
    expect(tablesQueried).not.toContain("profiles");
    expect(tablesQueried).not.toContain("student_accounts");
  });
});
