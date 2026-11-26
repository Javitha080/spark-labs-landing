import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prefetchQueryMock = vi.fn().mockResolvedValue(undefined);
const getQueryStateMock = vi.fn().mockReturnValue(undefined);
const fetchCachedBlogPostsMock = vi.fn().mockResolvedValue([]);
const fetchCachedEventsMock = vi.fn().mockResolvedValue([]);

vi.mock("@/lib/queryClient", () => ({
  queryClient: {
    prefetchQuery: prefetchQueryMock,
    getQueryState: getQueryStateMock,
  },
}));

vi.mock("@/lib/edgeApi", () => ({
  fetchCachedBlogPosts: fetchCachedBlogPostsMock,
  fetchCachedEvents: fetchCachedEventsMock,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

describe("prefetch", () => {
  beforeEach(() => {
    vi.resetModules();
    prefetchQueryMock.mockClear();
    getQueryStateMock.mockReset().mockReturnValue(undefined);
    fetchCachedBlogPostsMock.mockReset().mockResolvedValue([]);
    fetchCachedEventsMock.mockReset().mockResolvedValue([]);
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: undefined,
    });
  });

  it("skips route and data prefetch when saveData is enabled", async () => {
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: true, effectiveType: "4g" },
    });
    const { prefetchRoute, prefetchData } = await import("./prefetch");
    prefetchRoute("/blog");
    prefetchData("blog-posts");
    expect(prefetchQueryMock).not.toHaveBeenCalled();
  });

  it("skips data prefetch on 2g connections", async () => {
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: false, effectiveType: "2g" },
    });
    const { prefetchData } = await import("./prefetch");
    prefetchData("events");
    expect(prefetchQueryMock).not.toHaveBeenCalled();
  });

  it("ignores unknown routes and keys safely", async () => {
    const { prefetchRoute, prefetchData } = await import("./prefetch");
    expect(() => prefetchRoute("/does-not-exist-123")).not.toThrow();
    expect(() => prefetchData("unknown-key")).not.toThrow();
    expect(prefetchQueryMock).not.toHaveBeenCalled();
  });

  it("prefetches blog-posts and news-posts with exact Blog/News transforms", async () => {
    fetchCachedBlogPostsMock.mockResolvedValue([
      {
        id: "1",
        slug: "hello",
        title: "Hello",
        author_name: "null",
        category: "Tutorial",
      },
      {
        id: "2",
        slug: "news-1",
        title: "Club News",
        author_name: "Editor",
        category: "News",
      },
    ]);

    const { prefetchData } = await import("./prefetch");
    prefetchData("blog-posts");
    expect(prefetchQueryMock).toHaveBeenCalledTimes(1);
    const blogCall = prefetchQueryMock.mock.calls[0][0];
    expect(blogCall.queryKey).toEqual(["blog-posts"]);
    const blogResult = await blogCall.queryFn();
    expect(blogResult).toHaveLength(1);
    expect(blogResult[0].author_name).toBe("Young Innovators Club");
    expect(blogResult[0].views).toBe(0);

    prefetchData("news-posts");
    const newsCall = prefetchQueryMock.mock.calls[1][0];
    expect(newsCall.queryKey).toEqual(["news-posts"]);
    const newsResult = await newsCall.queryFn();
    expect(newsResult).toHaveLength(1);
    expect(newsResult[0].slug).toBe("news-1");
  });

  it("skips prefetchData when query cache is already fresh", async () => {
    getQueryStateMock.mockReturnValue({ dataUpdatedAt: Date.now() });
    const { prefetchData } = await import("./prefetch");
    prefetchData("events");
    expect(prefetchQueryMock).not.toHaveBeenCalled();
  });

  it("prefetches events sorted ascending by event_date", async () => {
    fetchCachedEventsMock.mockResolvedValue([
      { id: "2", event_date: "2026-12-01" },
      { id: "1", event_date: "2026-10-01" },
    ]);
    const { prefetchData } = await import("./prefetch");
    prefetchData("events");
    const eventsCall = prefetchQueryMock.mock.calls[0][0];
    const sorted = await eventsCall.queryFn();
    expect(sorted.map((e: { id: string }) => e.id)).toEqual(["1", "2"]);
  });
});
