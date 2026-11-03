import { useState } from "react";
import { Link } from "react-router-dom";
import { m } from "framer-motion";
import { ArrowUpRight, Bookmark, BookmarkCheck, Clock, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { PostSummary } from "@/lib/blogTypes";
import { cn, formatCompact, initialsOf } from "@/lib/utils";
import { useReadingList } from "./reading-prefs";
import { Highlight } from "./Highlight";

interface Props {
  post: PostSummary;
  index?: number;
  featured?: boolean;
  query?: string;
  variant?: "grid" | "list";
  priority?: boolean;
}

/** Cover with a graceful gradient + initials fallback if the image is absent or fails. */
export function Cover({ src, alt, label, className, priority }: { src: string | null; alt: string; label?: string; className?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn("relative overflow-hidden bg-gradient-to-br from-primary/25 via-accent/10 to-transparent", className)}>
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
        />
      ) : (
        <div className="grid size-full place-items-center bg-gradient-to-br from-primary/20 via-accent/10 to-transparent">
          <span className="font-display text-4xl font-bold text-primary/50">{initialsOf(label ?? "")}</span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
    </div>
  );
}

function SaveButton({ slug, title }: { slug: string; title: string }) {
  const { has, toggle } = useReadingList();
  const saved = has(slug);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove "${title}" from reading list` : `Save "${title}" to reading list`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const now = toggle(slug);
        toast(now ? "Saved to your reading list" : "Removed from reading list");
      }}
      className={cn(
        "relative z-20 grid size-10 place-items-center rounded-full border backdrop-blur-md transition",
        saved ? "border-transparent bg-[var(--rs-accent)] text-[var(--rs-bg)]" : "border-white/20 bg-black/40 text-white hover:bg-black/60",
      )}
    >
      {saved ? <BookmarkCheck className="size-[18px]" /> : <Bookmark className="size-[18px]" />}
    </button>
  );
}

function Meta({ post, query }: { post: PostSummary; query?: string }) {
  return (
    <div className="rs-muted flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
      <span className="flex items-center gap-2 font-medium text-[var(--rs-fg)]">
        <span className="grid size-6 place-items-center rounded-full bg-[color-mix(in_srgb,var(--rs-accent)_18%,transparent)] text-[10px] font-bold rs-accent-text">
          {initialsOf(post.author_name)}
        </span>
        <Highlight text={post.author_name} query={query ?? ""} />
      </span>
      {post.published_at && (
        <time dateTime={post.published_at}>{format(new Date(post.published_at), "MMM d, yyyy")}</time>
      )}
      {post.reading_time_minutes != null && (
        <span className="flex items-center gap-1"><Clock className="size-3.5" /> {post.reading_time_minutes} min</span>
      )}
      {post.views > 0 && (
        <span className="flex items-center gap-1"><Eye className="size-3.5" /> {formatCompact(post.views)}</span>
      )}
    </div>
  );
}

export default function PostCard({ post, index = 0, featured = false, query = "", variant = "grid", priority }: Props) {
  if (featured) {
    return (
      <m.article
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="group rs-surface relative grid overflow-hidden rounded-[2rem] shadow-sm transition-shadow hover:shadow-2xl lg:grid-cols-[1.15fr_1fr]"
      >
        <Link to={`/blog/${post.slug}`} className="absolute inset-0 z-10 rounded-[2rem]" aria-label={post.title} />
        <Cover src={post.cover_image_url} alt="" label={post.title} priority={priority} className="aspect-[16/10] lg:aspect-auto lg:min-h-[26rem]" />
        <div className="absolute right-4 top-4 z-20 lg:left-4 lg:right-auto">
          <SaveButton slug={post.slug} title={post.title} />
        </div>
        <div className="flex flex-col justify-center gap-5 p-6 sm:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--rs-accent)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--rs-bg)]">
              Featured
            </span>
            {post.category && (
              <span className="rs-border rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">{post.category}</span>
            )}
          </div>
          <h2 className="font-display text-3xl font-bold leading-[1.1] tracking-tight transition-colors group-hover:text-[var(--rs-accent)] sm:text-4xl">
            <Highlight text={post.title} query={query} />
          </h2>
          {post.excerpt && (
            <p className="rs-muted line-clamp-3 text-base leading-relaxed">
              <Highlight text={post.excerpt} query={query} />
            </p>
          )}
          <Meta post={post} query={query} />
          <span className="rs-accent-text inline-flex items-center gap-1.5 text-sm font-semibold">
            Read the story <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </div>
      </m.article>
    );
  }

  if (variant === "list") {
    return (
      <m.article
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="group rs-surface relative flex flex-col overflow-hidden rounded-2xl shadow-sm transition-shadow hover:shadow-xl sm:flex-row"
      >
        <Link to={`/blog/${post.slug}`} className="absolute inset-0 z-10" aria-label={post.title} />
        <Cover src={post.cover_image_url} alt="" label={post.title} priority={priority} className="aspect-[16/9] sm:aspect-auto sm:w-64 sm:shrink-0 lg:w-80" />
        <div className="absolute right-3 top-3 z-20 sm:left-3 sm:right-auto">
          <SaveButton slug={post.slug} title={post.title} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {post.category && (
              <span className="rounded-full bg-[color-mix(in_srgb,var(--rs-accent)_12%,transparent)] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rs-accent-text">
                {post.category}
              </span>
            )}
            <Meta post={post} query={query} />
          </div>
          <h2 className="font-display text-xl font-bold leading-snug tracking-tight transition-colors group-hover:text-[var(--rs-accent)] [text-wrap:balance]">
            <Highlight text={post.title} query={query} />
          </h2>
          {post.excerpt && (
            <p className="rs-muted line-clamp-2 text-sm leading-relaxed sm:text-[15px]">
              <Highlight text={post.excerpt} query={query} />
            </p>
          )}
        </div>
        <span className="rs-muted absolute bottom-5 right-5 hidden sm:bottom-auto sm:right-6 sm:top-6 sm:block">
          <ArrowUpRight className="size-5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--rs-accent)]" />
        </span>
      </m.article>
    );
  }

  return (
    <m.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay: (index % 3) * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className="group rs-surface relative flex h-full flex-col overflow-hidden rounded-3xl shadow-sm transition-shadow hover:shadow-xl"
    >
      <Link to={`/blog/${post.slug}`} className="absolute inset-0 z-10 rounded-3xl" aria-label={post.title} />
      <div className="relative">
        <Cover src={post.cover_image_url} alt="" label={post.title} priority={priority} className="aspect-[16/10]" />
        {post.category && (
          <span className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-md">
            {post.category}
          </span>
        )}
        <div className="absolute right-3 top-3 z-20"><SaveButton slug={post.slug} title={post.title} /></div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="font-display text-xl font-bold leading-snug tracking-tight transition-colors group-hover:text-[var(--rs-accent)] [text-wrap:balance]">
          <Highlight text={post.title} query={query} />
        </h3>
        {post.excerpt && (
          <p className="rs-muted line-clamp-2 text-sm leading-relaxed">
            <Highlight text={post.excerpt} query={query} />
          </p>
        )}
        <div className="mt-auto pt-2">
          {(post.tags ?? []).length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {(post.tags ?? []).slice(0, 3).map((t) => (
                <span key={t} className="rs-soft rs-muted rounded-full px-2.5 py-0.5 text-[11px]">
                  #<Highlight text={t} query={query} />
                </span>
              ))}
            </div>
          )}
          <Meta post={post} query={query} />
        </div>
      </div>
    </m.article>
  );
}

export { SaveButton };
