import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Bookmark, Flame, Hash, LayoutGrid, List, Search, SearchX, X } from "lucide-react";
import type { PostSummary, SortKey } from "@/lib/blogTypes";
import { SORTS } from "@/lib/blogTypes";
import { createLocalStore } from "@/lib/localStore";
import { cn } from "@/lib/utils";
import { useReadingList } from "./reading-prefs";
import PostCard from "./PostCard";

const PAGE = 9;

/** Listing layout preference, persisted per browser. */
const viewStore = createLocalStore<"grid" | "list">("yic_blog_view", "grid", (r) =>
  r === "list" ? "list" : "grid",
);

interface Props {
  posts: PostSummary[];
  /** Site-curated category order (without "All"). Curated chips sort first. */
  curatedCategories?: string[];
  initial: { q: string; category: string; tag: string | null; sort: SortKey };
}

export default function BlogExplorer({ posts, curatedCategories = [], initial }: Props) {
  const [q, setQ] = useState(initial.q);
  const [category, setCategory] = useState(initial.category);
  const [tag, setTag] = useState<string | null>(initial.tag);
  const [sort, setSort] = useState<SortKey>(initial.sort);
  const [onlySaved, setOnlySaved] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [showAllTags, setShowAllTags] = useState(false);
  const view = viewStore.useValue();
  const { saved, has } = useReadingList();
  const searchRef = useRef<HTMLInputElement>(null);

  /* "/" focuses search, Esc clears it */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.closest("input, textarea, select, [contenteditable='true']");
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === searchRef.current) {
        setQ("");
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Shareable URLs: /blog?q=&category=&tag=&sort= */
  useEffect(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (category !== "All") sp.set("category", category);
    if (tag) sp.set("tag", tag);
    if (sort !== "newest") sp.set("sort", sort);
    const qs = sp.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [q, category, tag, sort]);

  /* Curated categories first (site order, only when they have posts), then any
     category that exists in the data but is not curated. */
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    posts.forEach((p) => p.category && counts.set(p.category, (counts.get(p.category) ?? 0) + 1));
    const curated = curatedCategories.filter((c) => counts.has(c));
    const extra = [...counts.keys()]
      .filter((c) => !curatedCategories.includes(c))
      .sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
    return [...curated, ...extra];
  }, [posts, curatedCategories]);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    posts.forEach((p) => (p.tags ?? []).forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
  }, [posts]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = posts.filter((p) => {
      if (category !== "All" && p.category !== category) return false;
      if (tag && !(p.tags ?? []).includes(tag)) return false;
      if (onlySaved && !saved.includes(p.slug)) return false;
      if (!needle) return true;
      return [p.title, p.excerpt ?? "", p.category ?? "", p.author_name, ...(p.tags ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
    const time = (p: PostSummary) => (p.published_at ? new Date(p.published_at).getTime() : 0);
    out = [...out].sort((a, b) => {
      if (sort === "oldest") return time(a) - time(b);
      if (sort === "popular") return b.views - a.views;
      if (sort === "quick") return (a.reading_time_minutes ?? 99) - (b.reading_time_minutes ?? 99) || time(b) - time(a);
      return time(b) - time(a);
    });
    return out;
  }, [posts, q, category, tag, sort, onlySaved, saved]);

  /* Every filter interaction also rewinds pagination. */
  const resetting = (runner: () => void) => {
    runner();
    setLimit(PAGE);
  };

  const hasFilters = !!q.trim() || category !== "All" || !!tag || onlySaved || sort !== "newest";
  const clearAll = () =>
    resetting(() => {
      setQ("");
      setCategory("All");
      setTag(null);
      setOnlySaved(false);
      setSort("newest");
    });

  const featured = !hasFilters && sort === "newest" ? filtered.find((p) => p.is_featured) : undefined;
  const rest = featured ? filtered.filter((p) => p.id !== featured.id) : filtered;
  const shown = rest.slice(0, limit);
  const visibleTags = showAllTags ? tags : tags.slice(0, 8);

  const chip = (on: boolean) =>
    cn(
      "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200",
      on
        ? "border-transparent bg-[var(--rs-accent)] text-[var(--rs-bg)] shadow-md"
        : "rs-border rs-surface hover:border-[var(--rs-accent)]",
    );

  return (
    <div className="rs-stage relative">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[40rem] overflow-hidden"
        style={{
          maskImage: "linear-gradient(to bottom, black 40%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent)",
        }}
      >
        <div className="absolute -left-24 top-10 size-[28rem] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -right-24 top-32 size-[24rem] rounded-full bg-accent/15 blur-[120px]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        {/* Search + filters */}
        <section className="mx-auto mt-10 max-w-5xl" aria-label="Search and filter articles">
          <div className="rs-surface group flex items-center gap-3 rounded-full px-5 py-1.5 shadow-lg shadow-black/5 transition focus-within:border-[var(--rs-accent)] focus-within:shadow-xl">
            <Search className="size-5 shrink-0 text-[var(--rs-muted)]" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => resetting(() => setQ(e.target.value.slice(0, 80)))}
              placeholder="Search articles, tags, tools…"
              aria-label="Search articles"
              className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[var(--rs-muted)] sm:text-lg"
            />
            {q ? (
              <button
                type="button"
                onClick={() => resetting(() => setQ(""))}
                aria-label="Clear search"
                className="grid size-8 place-items-center rounded-full hover:bg-[var(--rs-soft)]"
              >
                <X className="size-4" />
              </button>
            ) : (
              <span className="kbd hidden sm:inline-flex">/</span>
            )}
          </div>

          <div
            className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
            role="tablist"
            aria-label="Categories"
          >
            <button
              type="button"
              role="tab"
              aria-selected={category === "All"}
              className={chip(category === "All")}
              onClick={() => resetting(() => setCategory("All"))}
            >
              All <span className="ml-1 opacity-60">{posts.length}</span>
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={category === c}
                className={chip(category === c)}
                onClick={() => resetting(() => setCategory(c))}
              >
                {c} <span className="ml-1 opacity-60">{posts.filter((p) => p.category === c).length}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Hash className="size-4 text-[var(--rs-muted)]" aria-hidden />
              {visibleTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={tag === t}
                  onClick={() => resetting(() => setTag(tag === t ? null : t))}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs transition",
                    tag === t
                      ? "bg-[var(--rs-accent)] text-[var(--rs-bg)]"
                      : "rs-soft rs-muted hover:text-[var(--rs-fg)]",
                  )}
                >
                  {t}
                </button>
              ))}
              {tags.length > 8 && (
                <button
                  type="button"
                  onClick={() => setShowAllTags((s) => !s)}
                  className="px-2 text-xs font-semibold text-primary hover:underline"
                >
                  {showAllTags ? "Show less" : `+${tags.length - 8} more`}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-pressed={onlySaved}
                onClick={() => resetting(() => setOnlySaved((s) => !s))}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition",
                  onlySaved
                    ? "border-transparent bg-[var(--rs-accent)] text-[var(--rs-bg)]"
                    : "rs-border rs-surface",
                )}
              >
                <Bookmark className={cn("size-4", onlySaved && "fill-current")} /> Saved
                <span className="rounded-full bg-black/10 px-1.5 text-xs dark:bg-white/10">{saved.length}</span>
              </button>
              <label className="sr-only" htmlFor="blog-sort">Sort by</label>
              <select
                id="blog-sort"
                value={sort}
                onChange={(e) => {
                  const next = e.target.value;
                  resetting(() => {
                    if (SORTS.some((s) => s.key === next)) setSort(next as SortKey);
                  });
                }}
                className="rs-surface h-10 cursor-pointer rounded-full px-4 text-sm font-medium outline-none"
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
              {/* Layout toggle — desktop only, persisted per browser */}
              <div className="hidden h-10 items-center rounded-full rs-surface p-1 sm:flex" role="group" aria-label="Layout">
                {([
                  ["grid", LayoutGrid, "Grid view"],
                  ["list", List, "List view"],
                ] as const).map(([v, Icon, label]) => (
                  <button
                    key={v}
                    type="button"
                    aria-label={label}
                    aria-pressed={view === v}
                    onClick={() => viewStore.set(v)}
                    className={cn(
                      "grid size-8 place-items-center rounded-full transition",
                      view === v ? "bg-[var(--rs-accent)] text-[var(--rs-bg)]" : "text-[var(--rs-muted)] hover:text-[var(--rs-fg)]",
                    )}
                  >
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Results */}
        <div className="mt-12" aria-live="polite">
          {hasFilters && (
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-[var(--rs-muted)]">
                <strong className="text-[var(--rs-fg)]">{filtered.length}</strong>{" "}
                {filtered.length === 1 ? "story" : "stories"} found
              </p>
              <button type="button" onClick={clearAll} className="text-sm font-semibold text-primary hover:underline">
                Clear all filters
              </button>
            </div>
          )}

          {featured && (
            <div className="mb-8">
              <PostCard post={featured} featured />
            </div>
          )}

          {!hasFilters && sort === "newest" && (
            <div className="mb-6 flex items-center gap-2">
              <Flame className="size-5 text-primary" aria-hidden />
              <h2 className="font-display text-2xl font-bold tracking-tight">Latest stories</h2>
            </div>
          )}

          {shown.length > 0 ? (
            <div className={cn(view === "grid" ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-5")}>
              <AnimatePresence mode="popLayout" initial={false}>
                {shown.map((p, i) => (
                  <m.div
                    key={p.id}
                    layout="position"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.28, delay: Math.min(i, 8) * 0.03 }}
                    className={view === "grid" ? "h-full" : undefined}
                  >
                    <PostCard
                      post={p}
                      index={i}
                      query={q}
                      variant={view === "list" ? "list" : "grid"}
                      priority={i < 3}
                    />
                  </m.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            !featured && (
              <m.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rs-surface mx-auto max-w-lg rounded-[2rem] p-10 text-center"
              >
                <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
                  {onlySaved ? <Bookmark className="size-7" /> : <SearchX className="size-7" />}
                </div>
                <h3 className="font-display text-2xl font-bold">
                  {onlySaved && saved.length === 0 ? "Your reading list is empty" : "No stories match"}
                </h3>
                <p className="rs-muted mt-2">
                  {onlySaved && saved.length === 0
                    ? "Tap the bookmark on any article to keep it for later."
                    : "Try a different keyword, or remove a filter."}
                </p>
                <button type="button" onClick={clearAll} className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
                  Reset filters
                </button>
              </m.div>
            )
          )}

          {rest.length > shown.length && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={() => setLimit((l) => l + PAGE)}
                className="inline-flex items-center gap-2 rounded-full border rs-border rs-surface px-6 py-3 text-sm font-semibold transition hover:border-[var(--rs-accent)] hover:text-[var(--rs-accent)]"
              >
                Load more ({rest.length - shown.length} left)
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
