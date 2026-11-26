import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import {
  ArrowUp,
  BookOpen,
  Calendar,
  Compass,
  Copy,
  Cpu,
  FolderGit2,
  GraduationCap,
  Home,
  Keyboard,
  LayoutDashboard,
  Moon,
  Newspaper,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fetchWithFallback } from "@/lib/edgeApi";
import { supabase } from "@/integrations/supabase/client";
import { isNewsCategory } from "@/lib/newsCategory";
import { prefetchRoute } from "@/lib/prefetch";
import { scrollToTarget, scrollToTop } from "@/lib/scroll";
import { copyToClipboard } from "@/lib/errors";
import { getCMSLandingPath } from "@/lib/rbac";
import { useRole } from "@/contexts/RoleContext";
import { useStudentSession } from "@/context/StudentAuthContext";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CommandGroup =
  | "Pages"
  | "Portal"
  | "Blog"
  | "News"
  | "Projects"
  | "Events"
  | "Courses"
  | "Actions";

interface CommandItem {
  id: string;
  label: string;
  subtitle?: string;
  keywords?: string;
  group: CommandGroup;
  path?: string;
  hashId?: string;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
}

interface PalettePost {
  id: string;
  title: string;
  slug: string;
  category?: string | null;
  excerpt?: string | null;
}

interface PaletteProject {
  id: string;
  title: string;
  category?: string | null;
}

interface PaletteEvent {
  id: string;
  title: string;
  event_date?: string | null;
  location?: string | null;
}

interface PaletteCourse {
  id: string;
  title: string;
  slug: string;
  category?: string | null;
  level?: string | null;
}

const STATIC_ROUTES = [
  { id: "home", label: "Home", subtitle: "Main landing page", path: "/", icon: Home },
  { id: "about", label: "About Us", subtitle: "Club story & mission", path: "/about", icon: Compass },
  { id: "projects", label: "Projects", subtitle: "Student STEM builds", path: "/projects", icon: FolderGit2 },
  { id: "events", label: "Events", subtitle: "Workshops, competitions & schedule", path: "/events", icon: Calendar },
  { id: "news", label: "News", subtitle: "Club announcements & highlights", path: "/news", icon: Newspaper },
  { id: "blog", label: "Blog", subtitle: "Engineering articles & tutorials", path: "/blog", icon: BookOpen },
  { id: "gallery", label: "Gallery", subtitle: "Photos & event captures", path: "/gallery", icon: Sparkles },
  { id: "team", label: "Team & Mentors", subtitle: "Club members and teachers", path: "/team", icon: Users },
  { id: "leadership", label: "Leadership Desktop", subtitle: "Interactive executive board workspace", path: "/leadership", icon: Users },
  { id: "learning-hub", label: "STEM Learning Hub", subtitle: "Courses, labs & workshops", path: "/learning-hub", icon: Cpu },
  { id: "verify", label: "Verify Certificate", subtitle: "Validate an issued YICDVP certificate", path: "/verify", icon: ShieldCheck },
  { id: "contact", label: "Contact", subtitle: "Reach out to the club", path: "/contact", icon: Compass },
  { id: "privacy", label: "Privacy Policy", subtitle: "Data & privacy policy", path: "/privacy-policy", icon: ShieldCheck },
  { id: "terms", label: "Terms of Service", subtitle: "Platform terms of use", path: "/terms-of-service", icon: ShieldCheck },
  { id: "anchor-features", label: "Why Us (Section)", subtitle: "Jump to landing features", path: "/#features", hashId: "features", icon: Sparkles },
  { id: "anchor-teachers", label: "Mentors (Section)", subtitle: "Jump to landing mentors", path: "/#teachers", hashId: "teachers", icon: GraduationCap },
  { id: "anchor-join", label: "Join the Club (Section)", subtitle: "Jump to membership application", path: "/#join", hashId: "join", icon: Sparkles },
];

const STALE_TIME_MS = 5 * 60 * 1000;

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? <CommandPaletteContent onOpenChange={onOpenChange} /> : null}
    </Dialog>
  );
}

function CommandPaletteContent({
  onOpenChange,
}: {
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { resolvedTheme, setTheme } = useTheme();
  const { role, canAccessCMS } = useRole();
  const { isAuthenticated } = useStudentSession();
  const listboxId = useId();
  const listRef = useRef<HTMLDivElement | null>(null);

  const { data: blogPosts = [] } = useQuery<PalettePost[]>({
    queryKey: ["blog-posts"],
    staleTime: STALE_TIME_MS,
    queryFn: async () => {
      const res = await fetchWithFallback<PalettePost>("/api/blog/posts", async () => {
        const { data, error } = await supabase
          .from("blog_posts")
          .select("id, title, slug, category, excerpt")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(50);
        return { data: (data as PalettePost[]) ?? null, error };
      });
      return res.data;
    },
  });

  const { data: projects = [] } = useQuery<PaletteProject[]>({
    queryKey: ["projects"],
    staleTime: STALE_TIME_MS,
    queryFn: async () => {
      const res = await fetchWithFallback<PaletteProject>("/api/projects", async () => {
        const { data, error } = await supabase
          .from("projects")
          .select("id, title, category")
          .order("display_order", { ascending: true })
          .limit(50);
        return { data: (data as PaletteProject[]) ?? null, error };
      });
      return res.data;
    },
  });

  const { data: events = [] } = useQuery<PaletteEvent[]>({
    queryKey: ["events"],
    staleTime: STALE_TIME_MS,
    queryFn: async () => {
      const res = await fetchWithFallback<PaletteEvent>("/api/events", async () => {
        const { data, error } = await supabase
          .from("events")
          .select("id, title, event_date, location")
          .order("event_date", { ascending: true })
          .limit(50);
        return { data: (data as PaletteEvent[]) ?? null, error };
      });
      return res.data;
    },
  });

  const { data: courses = [] } = useQuery<PaletteCourse[]>({
    queryKey: ["learning-courses-palette"],
    staleTime: STALE_TIME_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_courses")
        .select("id, title, slug, category, level")
        .eq("is_published", true)
        .order("display_order", { ascending: true })
        .limit(50);
      if (error) return [];
      return (data as PaletteCourse[]) ?? [];
    },
  });

  const goTo = useCallback(
    (path: string, hashId?: string) => {
      onOpenChange(false);
      if (hashId && pathname === "/") {
        scrollToTarget(hashId);
        return;
      }
      navigate(path);
    },
    [navigate, onOpenChange, pathname],
  );

  const allItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];

    for (const route of STATIC_ROUTES) {
      items.push({
        id: `route-${route.id}`,
        label: route.label,
        subtitle: route.subtitle,
        keywords: `${route.path} ${route.subtitle}`,
        group: "Pages",
        path: route.path,
        hashId: route.hashId,
        icon: route.icon,
        onSelect: () => goTo(route.path, route.hashId),
      });
    }

    if (isAuthenticated) {
      items.push(
        {
          id: "portal-dashboard",
          label: "Student Dashboard",
          subtitle: "Your profile, streaks & certificates",
          group: "Portal",
          path: "/student/dashboard",
          icon: GraduationCap,
          onSelect: () => goTo("/student/dashboard"),
        },
        {
          id: "portal-my-learning",
          label: "My Learning",
          subtitle: "Enrolled courses & progress",
          group: "Portal",
          path: "/learning-hub/my-learning",
          icon: BookOpen,
          onSelect: () => goTo("/learning-hub/my-learning"),
        },
      );
    } else {
      items.push({
        id: "portal-login",
        label: "Student Portal Sign In",
        subtitle: "Log in to access courses and certificates",
        group: "Portal",
        path: "/student/login",
        icon: GraduationCap,
        onSelect: () => goTo("/student/login"),
      });
    }

    if (canAccessCMS()) {
      const cmsPath = getCMSLandingPath(role);
      items.push({
        id: "portal-admin-cms",
        label: "Admin CMS",
        subtitle: `Open CMS (${cmsPath})`,
        keywords: "admin cms dashboard manage",
        group: "Portal",
        path: cmsPath,
        icon: LayoutDashboard,
        onSelect: () => goTo(cmsPath),
      });
    }

    for (const post of blogPosts) {
      if (!post?.slug || !post?.title) continue;
      const isNews = isNewsCategory(post.category);
      items.push({
        id: `post-${post.id || post.slug}`,
        label: post.title,
        subtitle: post.category || (isNews ? "News" : "Blog"),
        keywords: post.excerpt ?? undefined,
        group: isNews ? "News" : "Blog",
        path: `/blog/${post.slug}`,
        icon: isNews ? Newspaper : BookOpen,
        onSelect: () => goTo(`/blog/${post.slug}`),
      });
    }

    for (const project of projects) {
      if (!project?.id || !project?.title) continue;
      items.push({
        id: `project-${project.id}`,
        label: project.title,
        subtitle: project.category || "Project",
        group: "Projects",
        path: `/project/${project.id}`,
        icon: FolderGit2,
        onSelect: () => goTo(`/project/${project.id}`),
      });
    }

    for (const ev of events) {
      if (!ev?.id || !ev?.title) continue;
      items.push({
        id: `event-${ev.id}`,
        label: ev.title,
        subtitle: [ev.event_date, ev.location].filter(Boolean).join(" · ") || "Event",
        group: "Events",
        path: "/events",
        icon: Calendar,
        onSelect: () => goTo("/events"),
      });
    }

    for (const course of courses) {
      if (!course?.slug || !course?.title) continue;
      items.push({
        id: `course-${course.id || course.slug}`,
        label: course.title,
        subtitle: [course.category, course.level].filter(Boolean).join(" · ") || "Course",
        group: "Courses",
        path: `/learning-hub/course/${course.slug}`,
        icon: Cpu,
        onSelect: () => goTo(`/learning-hub/course/${course.slug}`),
      });
    }

    const isDark = resolvedTheme === "dark";
    items.push(
      {
        id: "action-theme",
        label: isDark ? "Switch to Light Theme" : "Switch to Dark Theme",
        subtitle: "Toggle appearance mode",
        keywords: "dark light mode theme appearance",
        group: "Actions",
        icon: isDark ? Sun : Moon,
        onSelect: () => {
          setTheme(isDark ? "light" : "dark");
          onOpenChange(false);
        },
      },
      {
        id: "action-copy-url",
        label: "Copy Current Page URL",
        subtitle: "Copy shareable link to clipboard",
        keywords: "share link copy url",
        group: "Actions",
        icon: Copy,
        onSelect: () => {
          void copyToClipboard(window.location.href).then((ok) => {
            if (ok) toast.success("Page URL copied to clipboard");
          });
          onOpenChange(false);
        },
      },
      {
        id: "action-shortcuts",
        label: "Keyboard Shortcuts",
        subtitle: "View keyboard navigation shortcuts (?)",
        keywords: "help keys shortcuts ?",
        group: "Actions",
        icon: Keyboard,
        onSelect: () => {
          onOpenChange(false);
          window.dispatchEvent(new CustomEvent("yicdvp:open-shortcuts"));
        },
      },
      {
        id: "action-scroll-top",
        label: "Scroll to Top",
        subtitle: "Jump back to top of page",
        keywords: "top scroll up",
        group: "Actions",
        icon: ArrowUp,
        onSelect: () => {
          onOpenChange(false);
          scrollToTop();
        },
      },
      {
        id: "action-clear-cache",
        label: "Clear Cache & Reload",
        subtitle: "Refresh offline assets and reload page",
        keywords: "pwa cache refresh reload",
        group: "Actions",
        icon: RefreshCw,
        onSelect: () => {
          onOpenChange(false);
          const clearFn = (window as unknown as { yicClearCacheAndReload?: () => void })
            .yicClearCacheAndReload;
          if (typeof clearFn === "function") clearFn();
          else window.location.reload();
        },
      },
    );

    return items;
  }, [
    blogPosts,
    canAccessCMS,
    courses,
    events,
    goTo,
    isAuthenticated,
    onOpenChange,
    projects,
    resolvedTheme,
    role,
    setTheme,
  ]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Show concise initial set: pages, portal, actions, plus top few dynamic entries
      const counts: Partial<Record<CommandGroup, number>> = {};
      return allItems.filter((item) => {
        if (item.group === "Pages" || item.group === "Portal" || item.group === "Actions") {
          return true;
        }
        const n = counts[item.group] ?? 0;
        if (n >= 3) return false;
        counts[item.group] = n + 1;
        return true;
      });
    }
    return allItems.filter((item) => {
      const hay = `${item.label} ${item.subtitle ?? ""} ${item.keywords ?? ""} ${item.group}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allItems, query]);

  const safeActiveIndex =
    filteredItems.length > 0 ? Math.min(activeIndex, filteredItems.length - 1) : -1;
  const activeItem = safeActiveIndex >= 0 ? filteredItems[safeActiveIndex] : undefined;

  useEffect(() => {
    if (!activeItem || !listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLElement>("[data-command-item-id]");
    const node = Array.from(items).find(
      (el) => el.getAttribute("data-command-item-id") === activeItem.id,
    );
    node?.scrollIntoView?.({ block: "nearest" });
  }, [activeItem]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredItems.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === "Enter" && activeItem) {
      e.preventDefault();
      activeItem.onSelect();
    }
  };

  return (
      <DialogContent
        className="sm:max-w-2xl p-0 overflow-hidden gap-0"
        data-lenis-prevent
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
          <DialogDescription>
            Search pages, blog posts, news, projects, events, STEM courses, and quick actions.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
          <Search className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, articles, projects, courses, or actions..."
            aria-label="Search commands and site content"
            aria-controls={listboxId}
            aria-activedescendant={activeItem ? `${listboxId}-${activeItem.id}` : undefined}
            autoFocus
            className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 text-sm sm:text-base h-9"
          />
        </div>

        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Command palette results"
          data-command-list
          data-lenis-prevent
          className="max-h-[55vh] overflow-y-auto overscroll-contain p-2 space-y-1"
        >
          {filteredItems.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No matches found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === safeActiveIndex;
              return (
                <button
                  key={item.id}
                  id={`${listboxId}-${item.id}`}
                  data-command-item-id={item.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => {
                    setActiveIndex(idx);
                    if (item.path) prefetchRoute(item.path);
                  }}
                  onFocus={() => {
                    setActiveIndex(idx);
                    if (item.path) prefetchRoute(item.path);
                  }}
                  onClick={item.onSelect}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 min-h-[44px] text-left transition-colors ${
                    isSelected
                      ? "bg-primary/15 text-foreground border border-primary/30"
                      : "text-foreground/85 hover:bg-muted/60 border border-transparent"
                  }`}
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{item.label}</span>
                    {item.subtitle && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.subtitle}
                      </span>
                    )}
                  </span>
                  <Badge variant="outline" className="shrink-0 text-[10px] uppercase tracking-wider">
                    {item.group}
                  </Badge>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/40 bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
          <span>↑↓ Navigate · Enter Open · Esc Close</span>
          <span>Press ? for shortcuts</span>
        </div>
      </DialogContent>
  );
}

export default CommandPalette;
