import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AnimatePresence,
  m,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Clock,
  Cpu,
  Eye,
  Headphones,
  ListTree,
  Pause,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { PostSummary, PostFull } from "@/lib/blogTypes";
import type { TocItem } from "@/lib/blog-content";
import { cn, formatCompact, initialsOf } from "@/lib/utils";
import ArticleBody from "./ArticleBody";
import { useActiveHeading } from "./useActiveHeading";
import PostCard, { Cover } from "./PostCard";
import ReadingSidebar, { type SidebarTab } from "./ReadingSidebar";
import PostShare from "@/components/blog/PostShare";
import { THEMES, setPrefs, stageProps, useReadingList, useReadingPrefs } from "./reading-prefs";
import { useListen } from "./useListen";

/** Chronological neighbours only need the card link fields; the rest is unknown at query time. */
type NeighbourPost = Pick<PostSummary, "id" | "title" | "slug">;

interface Props {
  post: PostFull;
  html: string;
  toc: TocItem[];
  words: number;
  related: PostSummary[];
  newer: NeighbourPost | null;
  older: NeighbourPost | null;
}

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

/** Progress through the article itself (not the whole page), at 60% of the viewport height. */
function useReadProgress(ref: React.RefObject<HTMLElement | null>) {
  const mv = useMotionValue(0);
  const [percent, setPercent] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const compute = () => {
      const r = el.getBoundingClientRect();
      const line = window.innerHeight * 0.6;
      const p = clamp((line - r.top) / Math.max(r.height, 1), 0, 1);
      mv.set(p);
      setPercent(Math.round(p * 100));
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      ro.disconnect();
    };
  }, [ref, mv]);
  return { mv, percent };
}

export default function ArticleView({ post, html, toc, words, related, newer, older }: Props) {
  const proseRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const { prefs } = useReadingPrefs();
  const stage = stageProps(prefs);
  const listen = useListen(proseRef);
  const { mv, percent } = useReadProgress(proseRef);
  const smooth = useSpring(mv, { stiffness: 220, damping: 32, mass: 0.4 });
  const activeId = useActiveHeading(toc.map((t) => t.id));
  const [tab, setTab] = useState<SidebarTab>("contents");
  const [sheet, setSheet] = useState<SidebarTab | null>(null);
  const { has, toggle } = useReadingList();
  const saved = has(post.slug);

  const { scrollYProgress } = useScroll({ target: coverRef, offset: ["start end", "end start"] });
  const coverY = useTransform(scrollYProgress, [0, 1], ["-7%", "7%"]);

  const minutes = post.reading_time_minutes ?? Math.max(1, Math.round(words / 200));
  const minutesLeft = Math.ceil((words / 200) * (1 - percent / 100));

  /* resume reading */
  const posKey = `yic-pos:${post.slug}`;
  useEffect(() => {
    if (!prefs.resume || location.hash) return;
    let pct = 0;
    try {
      pct = Number(localStorage.getItem(posKey) ?? 0);
    } catch {
      return;
    }
    if (pct < 6 || pct > 94) return;
    const t = setTimeout(() => {
      toast("Welcome back 👋", {
        description: `You were ${pct}% through this article.`,
        duration: 9000,
        action: {
          label: "Resume",
          onClick: () => {
            const el = proseRef.current;
            if (!el) return;
            const top = el.getBoundingClientRect().top + window.scrollY;
            window.scrollTo({ top: top + (pct / 100) * el.offsetHeight - window.innerHeight * 0.4, behavior: "smooth" });
          },
        },
      });
    }, 900);
    return () => clearTimeout(t);
    // run once per article
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.slug]);

  useEffect(() => {
    if (!prefs.resume) return;
    try {
      if (percent >= 97) localStorage.removeItem(posKey);
      else if (percent >= 3) localStorage.setItem(posKey, String(percent));
    } catch {
      /* storage unavailable */
    }
  }, [percent, prefs.resume, posKey]);

  /* keyboard shortcuts */
  const listenToggle = listen.toggle;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable='true']")) return;
      switch (e.key.toLowerCase()) {
        case "+":
        case "=":
          setPrefs({ size: prefs.size + 1 });
          break;
        case "-":
          setPrefs({ size: prefs.size - 1 });
          break;
        case "f":
          setPrefs({ focus: !prefs.focus });
          break;
        case "r":
          setPrefs({ ruler: !prefs.ruler });
          break;
        case "t": {
          const i = THEMES.findIndex((x) => x.key === prefs.theme);
          setPrefs({ theme: THEMES[(i + 1) % THEMES.length].key });
          break;
        }
        case "l":
          listenToggle();
          break;
        case "s":
          setTab("settings");
          break;
        default:
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prefs, listenToggle]);

  const closeSheet = useCallback(() => setSheet(null), []);

  return (
    <div {...stage}>
      {/* Top progress bar */}
      <m.div
        aria-hidden
        className="fixed inset-x-0 top-0 z-[70] h-[3px] origin-left bg-gradient-to-r from-primary to-accent"
        style={{ scaleX: smooth }}
      />

      <main className="pb-28 pt-28 sm:pt-32 lg:pb-24">
        <div className="mx-auto w-full max-w-[84rem] px-4 sm:px-6 lg:px-8">
          {/* Top bar */}
          <div className="mb-8 flex items-center justify-between gap-3">
            <Link
              to="/blog"
              className="rs-border rs-surface group flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition hover:border-[var(--rs-accent)]"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" /> All articles
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-pressed={saved}
                onClick={() => toast(toggle(post.slug) ? "Saved to your reading list" : "Removed from reading list")}
                className={cn(
                  "flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition",
                  saved ? "border-transparent bg-[var(--rs-accent)] text-[var(--rs-bg)]" : "rs-border rs-surface hover:border-[var(--rs-accent)]",
                )}
              >
                {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
                <span className="hidden sm:inline">{saved ? "Saved" : "Save"}</span>
              </button>
              <PostShare slug={post.slug} title={post.title} />
            </div>
          </div>

          {/* Title block */}
          <header className="max-w-4xl">
            <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-5 flex flex-wrap items-center gap-2">
              {post.category && (
                <Link
                  to={`/blog?category=${encodeURIComponent(post.category)}`}
                  className="rounded-full bg-[color-mix(in_srgb,var(--rs-accent)_16%,transparent)] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rs-accent-text transition hover:bg-[color-mix(in_srgb,var(--rs-accent)_26%,transparent)]"
                >
                  {post.category}
                </Link>
              )}
              {post.is_featured && <span className="rs-border rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider">Featured</span>}
            </m.div>
            <m.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-4xl font-bold leading-[1.05] tracking-tight [text-wrap:balance] sm:text-5xl lg:text-6xl"
            >
              {post.title}
            </m.h1>
            {post.excerpt && (
              <m.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="rs-muted mt-5 max-w-3xl text-lg leading-relaxed [text-wrap:pretty] sm:text-xl"
              >
                {post.excerpt}
              </m.p>
            )}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-[color-mix(in_srgb,var(--rs-accent)_18%,transparent)] font-display font-bold rs-accent-text">
                  {initialsOf(post.author_name)}
                </span>
                <div className="leading-tight">
                  <p className="font-semibold">{post.author_name}</p>
                  <p className="rs-muted text-xs">Young Innovators Club</p>
                </div>
              </div>
              {post.published_at && (
                <span className="rs-muted flex items-center gap-1.5">
                  <time dateTime={post.published_at}>{format(new Date(post.published_at), "MMMM d, yyyy")}</time>
                </span>
              )}
              <span className="rs-muted flex items-center gap-1.5"><Clock className="size-4" /> {minutes} min read</span>
              <span className="rs-muted flex items-center gap-1.5"><Eye className="size-4" /> {formatCompact(post.views)} views</span>
            </m.div>
          </header>

          {/* Cover */}
          {post.cover_image_url && (
            <div ref={coverRef} className="mt-10 overflow-hidden rounded-[2rem] shadow-xl">
              <m.div style={prefs.calm ? undefined : { y: coverY, scale: 1.14 }} className="group">
                <Cover src={post.cover_image_url} alt={post.title} className="aspect-[16/8] w-full" priority />
              </m.div>
            </div>
          )}

          {/* Reading layout: article on the left, reading panel docked on the right */}
          <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_21.5rem] xl:gap-12">
            <article className="rs-surface rounded-[2rem] px-5 py-10 shadow-sm sm:px-10 sm:py-14 lg:px-14 lg:py-16 xl:px-20">
              <div className="rs-article">
                <ArticleBody html={html} proseRef={proseRef} focus={prefs.focus} ruler={prefs.ruler} />
              </div>

              {/* End of article */}
              <footer className="mx-auto mt-14 max-w-[var(--rs-measure)] border-t rs-border pt-8" style={{ fontFamily: "var(--font-sans)" }}>
                {(post.tech_stack ?? []).length > 0 && (
                  <div className="mb-6">
                    <p className="rs-muted mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]">
                      <Cpu className="size-3.5" /> Tools &amp; tech used
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(post.tech_stack ?? []).map((t) => (
                        <span key={t} className="rs-soft rounded-full px-3 py-1 text-xs font-medium">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {(post.tags ?? []).length > 0 && (
                  <div className="mb-8 flex flex-wrap gap-2">
                    {(post.tags ?? []).map((t) => (
                      <Link
                        key={t}
                        to={`/blog?tag=${encodeURIComponent(t)}`}
                        className="rs-border rounded-full border px-3 py-1 text-xs transition hover:border-[var(--rs-accent)] hover:text-[var(--rs-accent)]"
                      >
                        #{t}
                      </Link>
                    ))}
                  </div>
                )}
                <div className="rs-soft flex flex-col items-start justify-between gap-4 rounded-2xl p-5 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-display text-lg font-bold">Enjoyed this article?</p>
                    <p className="rs-muted text-sm">Pass it to a friend who loves building things.</p>
                  </div>
                  <PostShare slug={post.slug} title={post.title} description={post.excerpt} variant="inline" />
                </div>
              </footer>
            </article>

            <aside className="sticky top-24 hidden lg:block" aria-label="Reading tools">
              <ReadingSidebar
                toc={toc}
                activeId={activeId}
                percent={percent}
                minutesLeft={minutesLeft}
                listen={listen}
                tab={tab}
                onTab={setTab}
                bodyClassName="max-h-[calc(100vh-26rem)] min-h-[11rem]"
              />
            </aside>
          </div>

          {/* Chronological neighbours */}
          <section className="mt-14 grid gap-4 md:grid-cols-2">
            {newer ? (
              <NeighbourLink dir="newer" post={newer} />
            ) : (
              <span />
            )}
            {older && <NeighbourLink dir="older" post={older} />}
          </section>

          {related.length > 0 && (
            <section className="mt-20" aria-labelledby="related-heading">
              <div className="mb-8 flex items-center gap-3">
                <BookOpen className="size-6 rs-accent-text" />
                <h2 id="related-heading" className="font-display text-3xl font-bold tracking-tight">Keep reading</h2>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {related.map((p, i) => (
                  <PostCard key={p.id} post={p} index={i} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Mobile / tablet dock */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[65] flex justify-center px-4 lg:hidden">
        <m.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 260, damping: 26 }}
          className="rs-surface pointer-events-auto flex items-center gap-1 rounded-full p-1.5 shadow-2xl"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          <DockBtn label="Contents" onClick={() => { setTab("contents"); setSheet("contents"); }} icon={<ListTree className="size-[18px]" />} />
          <DockBtn label="Reading settings" onClick={() => { setTab("settings"); setSheet("settings"); }} icon={<SlidersHorizontal className="size-[18px]" />} />
          {listen.supported && (
            <DockBtn
              label={listen.status === "playing" ? "Pause listening" : "Listen"}
              onClick={listen.toggle}
              active={listen.status !== "idle"}
              icon={listen.status === "playing" ? <Pause className="size-[18px]" /> : <Headphones className="size-[18px]" />}
            />
          )}
          <span className="rs-border mx-1 h-6 border-l" />
          <span className="px-2 text-xs font-bold tabular-nums">{percent}%</span>
          <DockBtn label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} icon={<ArrowUp className="size-[18px]" />} />
        </m.div>
      </div>

      <AnimatePresence>
        {sheet && (
          <>
            <m.div
              key="backdrop"
              className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-[2px] lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSheet}
            />
            <m.div
              key="sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Reading tools"
              className="fixed inset-x-0 bottom-0 z-[95] mx-auto max-w-xl lg:hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 36 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_, info) => info.offset.y > 110 && closeSheet()}
            >
              <div className="rs-stage rounded-t-[2rem]" {...{ "data-rtheme": prefs.theme, "data-rfont": prefs.font }} style={{ ...stage.style, background: "transparent" }}>
                <div className="relative">
                  <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/50" />
                  <button type="button" onClick={closeSheet} aria-label="Close" className="rs-surface absolute right-3 top-5 z-10 grid size-9 place-items-center rounded-full">
                    <X className="size-4" />
                  </button>
                  <ReadingSidebar
                    toc={toc}
                    activeId={activeId}
                    percent={percent}
                    minutesLeft={minutesLeft}
                    listen={listen}
                    tab={sheet}
                    onTab={(t) => { setTab(t); setSheet(t); }}
                    onNavigate={closeSheet}
                    bodyClassName="max-h-[42vh]"
                  />
                </div>
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function DockBtn({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "grid size-11 place-items-center rounded-full transition",
        active ? "bg-[var(--rs-accent)] text-[var(--rs-bg)]" : "hover:bg-[var(--rs-soft)]",
      )}
    >
      {icon}
    </button>
  );
}

function NeighbourLink({ post, dir }: { post: NeighbourPost; dir: "newer" | "older" }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className={cn(
        "group rs-surface flex flex-col gap-2 rounded-3xl p-6 transition hover:border-[var(--rs-accent)] hover:shadow-lg",
        dir === "older" && "md:items-end md:text-right",
      )}
    >
      <span className="rs-muted flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em]">
        {dir === "newer" && <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />}
        {dir === "newer" ? "Newer story" : "Older story"}
        {dir === "older" && <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />}
      </span>
      <span className="font-display text-xl font-bold leading-snug tracking-tight transition-colors group-hover:text-[var(--rs-accent)]">
        {post.title}
      </span>
    </Link>
  );
}
