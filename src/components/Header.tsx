// react-doctor-disable no-giant-component
import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  ArrowRight,
  Sparkles,
  Facebook,
  Instagram,
  Youtube,
  Home,
  Layers,
  Users,
  GraduationCap,
  Calendar,
  Image as ImageIcon,
  Mail,
  BookOpen,
  Cpu,
  Newspaper,
  Search,
  UserCheck,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import OptimizedImage from "@/components/common/OptimizedImage";
import { ThemeToggle } from "@/components/admin/ThemeToggle";
import { clubLogo } from "@/components/ClubLogo";
import { m, useScroll, useMotionValueEvent } from "framer-motion";
import HeaderLiquidGlass from "@/components/effects/HeaderLiquidGlass";
import ShinyText from "@/components/reactbits/ShinyText";
import { scrollToTarget } from "@/lib/scroll";
import { prefetchRoute, prefetchData } from "@/lib/prefetch";
import { useSiteFooterInView } from "@/hooks/useSiteFooterInView";
import { useStudentSession } from "@/context/StudentAuthContext";

type MenuItem = {
  id: string;
  label: string;
  path?: string;
  icon: React.ComponentType<{ className?: string }>;
};

const menuItems: MenuItem[] = [
  { id: "hero", label: "Home", path: "/", icon: Home },
  { id: "features", label: "Why Us", path: "/#features", icon: Sparkles },
  { id: "projects", label: "Projects", path: "/#projects", icon: Layers },
  // Team links to the dedicated /leadership page (not an in-page anchor).
  // Scroll-spy id "team" below is the home-page leadership preview section
  // (see Index.tsx LazySection id="team") - it only drives the active pill
  // highlight while on "/".
  { id: "team", label: "Team", path: "/leadership", icon: Users },
  { id: "teachers", label: "Mentors", path: "/#teachers", icon: GraduationCap },
  { id: "events", label: "Events", path: "/#events", icon: Calendar },
  { id: "gallery", label: "Gallery", path: "/#gallery", icon: ImageIcon },
  { id: "contact", label: "Contact", path: "/#contact", icon: Mail },
];

const socialLinks = [
  { icon: Facebook, href: "https://www.facebook.com/dharmapalaLKofficia/", label: "Facebook" },
  { icon: Instagram, href: "https://www.instagram.com/yicdvp_official/", label: "Instagram" },
  { icon: Youtube, href: "https://www.youtube.com/channel/UCqCTubkeHjeldLAC4Jh1j8Q", label: "YouTube" },
];

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(() =>
    typeof window !== "undefined" ? window.scrollY > 50 : false,
  );
  const [activeSection, setActiveSection] = useState("hero");
  // The glass navbar ducks out while the animated footer is on screen -
  // same shared observer the FAB and ScrollToTop already listen to.
  const footerInView = useSiteFooterInView();
  const { isAuthenticated } = useStudentSession();
  const studentTarget = isAuthenticated ? "/student/dashboard" : "/student/login";
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === "/";

  const { scrollY } = useScroll();

  // Threshold-gated boolean transition: only updates React state when crossing 50px
  useMotionValueEvent(scrollY, "change", (latest) => {
    const next = latest > 50;
    setIsScrolled((prev) => (prev === next ? prev : next));
  });

  // Robust Scroll Spy using IntersectionObserver to prevent reflows
  useEffect(() => {
    if (!isHomePage || typeof IntersectionObserver === "undefined") return;

    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -65% 0px", // Focus on top third/center of screen
      threshold: 0,
    };

    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const sections = ["hero", "features", "projects", "team", "teachers", "events", "gallery", "contact"];

    sections.forEach((section) => {
      const element = document.getElementById(section);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [isHomePage]);

  const scrollToSection = useCallback(
    (id: string) => {
      setIsMenuOpen(false);
      if (isHomePage) {
        // Lenis-aware scroll with the header offset baked in (lib/scroll).
        scrollToTarget(id);
      } else {
        // Cross-page: navigate with the hash. Index's hash effect owns the
        // scroll once the landing page is mounted (no racing element lookups).
        navigate(`/#${id}`);
      }
    },
    [isHomePage, navigate],
  );

  const handleNavClick = useCallback(
    (item: MenuItem) => {
      if (item.path && !item.path.includes("#") && item.path !== "/") {
        navigate(item.path);
        setIsMenuOpen(false);
      } else {
        scrollToSection(item.id);
      }
    },
    [navigate, scrollToSection],
  );

  const prefetchForItem = useCallback(
    (item: { id?: string; path?: string }) => {
      if (item.path === "/learning-hub") {
        prefetchRoute("/learning-hub");
        return;
      }
      if (item.path === "/news") {
        prefetchRoute("/news");
        prefetchData("news-posts");
        return;
      }
      if (item.path === "/blog") {
        prefetchRoute("/blog");
        prefetchData("blog-posts");
        return;
      }
      if (item.path === "/leadership") {
        prefetchRoute("/leadership");
        return;
      }
      if (item.id === "projects") {
        if (!isHomePage) prefetchRoute("/");
        prefetchData("projects-featured");
        return;
      }
      if (item.id === "teachers") {
        if (!isHomePage) prefetchRoute("/");
        prefetchData("teachers");
        return;
      }
      if (item.id === "events") {
        if (!isHomePage) prefetchRoute("/");
        prefetchData("events");
        return;
      }
      if (item.path) {
        if (item.path.startsWith("/#")) {
          if (!isHomePage) prefetchRoute("/");
        } else {
          prefetchRoute(item.path);
        }
      }
    },
    [isHomePage],
  );

  const openCommandPalette = useCallback(() => {
    setIsMenuOpen(false);
    window.dispatchEvent(new CustomEvent("yicdvp:open-command-palette"));
  }, []);

  return (
    <m.header
      className="fixed left-0 right-0 z-50 flex justify-center items-start pt-4 pointer-events-none"
      initial={{ opacity: 1, y: 0 }}
      animate={{
        opacity: isMenuOpen || footerInView ? 0 : 1,
        y: isMenuOpen || footerInView ? -24 : 0,
      }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{
        top: "var(--offline-banner-h, 0px)",
      }}
      role="banner"
    >
      <HeaderLiquidGlass
        isScrolled={isScrolled}
        className={`relative flex items-center justify-between gap-2 min-h-[56px] px-3 py-3 md:px-4 xl:px-5 w-full ${
          isMenuOpen || footerInView ? "pointer-events-none" : "pointer-events-auto"
        }`}
      >
        {/* Logo Section */}
        <div className="flex items-center gap-4 flex-shrink-0 min-w-0">
          <Link
            to="/"
            onMouseEnter={() => !isHomePage && prefetchRoute("/")}
            onFocus={() => !isHomePage && prefetchRoute("/")}
            className="flex items-center gap-2 xl:gap-3 group relative z-50 min-w-0"
            onClick={() => scrollToSection("hero")}
          >
            <div className="size-10 md:size-11 xl:size-12 shrink-0 overflow-hidden flex items-center justify-center bg-background/50 rounded-xl p-1.5 border border-border/50 group-hover:border-primary/50 transition-all shadow-sm">
              <OptimizedImage
                src={clubLogo}
                alt="YICDVP Logo"
                width={48}
                height={48}
                className="size-full bg-transparent object-contain drop-shadow-sm"
                priority
              />
            </div>
            <div className="flex flex-col min-w-0 shrink">
              {/* ReactBits ShinyText: the wordmark carries an ember sheen that
                  sweeps only while the pointer is over the brand link — a
                  discoverable hover-cue instead of a plain color flip;
                  frozen static under reduced motion. */}
              <ShinyText
                text="yicdvp"
                trigger="hover"
                followPointer={false}
                color="hsl(var(--foreground))"
                shineColor="#f97316"
                bands={1}
                glow={0.25}
                className="font-display font-black text-lg leading-none lowercase tracking-tighter truncate"
              />
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground group-hover:text-foreground transition-colors truncate">
                est 2020
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation - always in flex flow so 11 items never overlap logo or actions */}
        <nav className="hidden lg:flex items-center justify-center flex-1 min-w-0 z-10">
          <ul
            className="relative flex items-center gap-0 xl:gap-0.5 p-1 rounded-full bg-background/40 border border-border/50"
            role="menubar"
            aria-label="Main Navigation"
          >
            {menuItems.map((item) => {
              const isActive = isHomePage
                ? activeSection === item.id
                : item.path?.includes("#")
                  ? location.hash === item.path.slice(item.path.indexOf("#"))
                  : item.path !== "/" && location.pathname === item.path;

              return (
                <li key={item.id} className="relative" role="presentation">
                  <m.button
                    role="menuitem"
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => handleNavClick(item)}
                    onMouseEnter={() => prefetchForItem(item)}
                    onFocus={() => prefetchForItem(item)}
                    className={`relative px-1.5 xl:px-2 py-2 text-[9.5px] xl:text-[10px] font-bold uppercase tracking-[0.04em] xl:tracking-[0.1em] transition-all rounded-full whitespace-nowrap border border-transparent ${
                      isActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/10 hover:border-white/10"
                    }`}
                    style={{ position: "relative" }}
                  >
                    {isActive && (
                      <m.div
                        layoutId="active-pill"
                        className="absolute inset-0 rounded-full overflow-hidden"
                        transition={{ type: "spring" as const, stiffness: 300, damping: 25 }}
                      >
                        {/* Liquid Glass Background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-secondary opacity-90" />
                        <div className="absolute inset-0 bg-background/20" />
                        {/* Static glass sheen (no loop) */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12" />
                        {/* Glass edge highlight */}
                        <div className="absolute inset-0 rounded-full border border-primary-foreground/20" />
                      </m.div>
                    )}
                    <span className="relative z-10">{item.label}</span>
                  </m.button>
                </li>
              );
            })}

            <li className="relative" role="presentation">
              <Link
                to="/learning-hub"
                role="menuitem"
                aria-current={location.pathname === "/learning-hub" ? "page" : undefined}
                onMouseEnter={() => prefetchForItem({ path: "/learning-hub" })}
                onFocus={() => prefetchForItem({ path: "/learning-hub" })}
                className={`relative px-1.5 xl:px-2 py-2 text-[9.5px] xl:text-[10px] font-bold uppercase tracking-[0.04em] xl:tracking-[0.1em] transition-all rounded-full flex items-center group whitespace-nowrap border border-transparent ${
                  location.pathname === "/learning-hub"
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                }`}
                style={{ position: "relative" }}
              >
                {location.pathname === "/learning-hub" && (
                  <m.div
                    layoutId="active-pill"
                    className="absolute inset-0 rounded-full overflow-hidden"
                    transition={{ type: "spring" as const, stiffness: 300, damping: 25 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-secondary opacity-90" />
                    <div className="absolute inset-0 bg-background/20" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12" />
                    <div className="absolute inset-0 rounded-full border border-primary-foreground/20" />
                    <div className="absolute -inset-1 bg-primary/30 rounded-full blur-md -z-10" />
                  </m.div>
                )}
                <span className="relative z-10">STEM</span>
              </Link>
            </li>
            <li className="relative" role="presentation">
              <Link
                to="/news"
                role="menuitem"
                aria-current={location.pathname.startsWith("/news") ? "page" : undefined}
                onMouseEnter={() => prefetchForItem({ path: "/news" })}
                onFocus={() => prefetchForItem({ path: "/news" })}
                className={`relative px-1.5 xl:px-2 py-2 text-[9.5px] xl:text-[10px] font-bold uppercase tracking-[0.04em] xl:tracking-[0.1em] transition-all rounded-full flex items-center group whitespace-nowrap border border-transparent ${
                  location.pathname.startsWith("/news")
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                }`}
                style={{ position: "relative" }}
              >
                {location.pathname.startsWith("/news") && (
                  <m.div
                    layoutId="active-pill"
                    className="absolute inset-0 rounded-full overflow-hidden"
                    transition={{ type: "spring" as const, stiffness: 300, damping: 25 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-secondary opacity-90" />
                    <div className="absolute inset-0 bg-background/20" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12" />
                    <div className="absolute inset-0 rounded-full border border-primary-foreground/20" />
                    <div className="absolute -inset-1 bg-primary/30 rounded-full blur-md -z-10" />
                  </m.div>
                )}
                <span className="relative z-10">NEWS</span>
              </Link>
            </li>
            <li className="relative" role="presentation">
              <Link
                to="/blog"
                role="menuitem"
                aria-current={location.pathname.startsWith("/blog") ? "page" : undefined}
                onMouseEnter={() => prefetchForItem({ path: "/blog" })}
                onFocus={() => prefetchForItem({ path: "/blog" })}
                className={`relative px-1.5 xl:px-2 py-2 text-[9.5px] xl:text-[10px] font-bold uppercase tracking-[0.04em] xl:tracking-[0.1em] transition-all rounded-full flex items-center group whitespace-nowrap border border-transparent ${
                  location.pathname.startsWith("/blog")
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                }`}
                style={{ position: "relative" }}
              >
                {location.pathname.startsWith("/blog") && (
                  <m.div
                    layoutId="active-pill"
                    className="absolute inset-0 rounded-full overflow-hidden"
                    transition={{ type: "spring" as const, stiffness: 300, damping: 25 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-secondary opacity-90" />
                    <div className="absolute inset-0 bg-background/20" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12" />
                    <div className="absolute inset-0 rounded-full border border-primary-foreground/20" />
                    <div className="absolute -inset-1 bg-primary/30 rounded-full blur-md -z-10" />
                  </m.div>
                )}
                <span className="relative z-10">BLOG</span>
              </Link>
            </li>
          </ul>
        </nav>

        {/* Right Actions */}
        <div className="hidden lg:flex items-center gap-1 xl:gap-2 z-10 flex-shrink-0">
          <button
            type="button"
            onClick={openCommandPalette}
            aria-label="Search site (Ctrl+K)"
            title="Search & quick commands (Ctrl+K)"
            className="inline-flex items-center justify-center gap-2 shrink-0 whitespace-nowrap rounded-full h-9 px-2.5 xl:px-3.5 bg-muted/50 hover:bg-muted border border-border/50 hover:border-primary/30 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <kbd className="hidden xl:inline-flex items-center shrink-0 rounded bg-background/70 border border-border/40 px-1.5 py-0.5 font-mono text-[10px] leading-none font-semibold">
              ⌘K
            </kbd>
          </button>

          <Link
            to={studentTarget}
            onMouseEnter={() => prefetchRoute(studentTarget)}
            onFocus={() => prefetchRoute(studentTarget)}
            aria-label={isAuthenticated ? "Student Dashboard" : "Student Portal"}
            title={isAuthenticated ? "Student Dashboard" : "Student Portal"}
            className="inline-flex items-center justify-center size-9 rounded-full bg-muted/50 hover:bg-muted border border-border/50 hover:border-primary/30 text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {isAuthenticated ? (
              <UserCheck className="size-4 text-primary" />
            ) : (
              <GraduationCap className="size-4" />
            )}
          </Link>

          <Link
            to="/verify"
            onMouseEnter={() => prefetchRoute("/verify")}
            onFocus={() => prefetchRoute("/verify")}
            aria-label="Verify Certificate"
            title="Verify Certificate"
            className="hidden xl:inline-flex items-center justify-center size-9 rounded-full bg-muted/50 hover:bg-muted border border-border/50 hover:border-primary/30 text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ShieldCheck className="size-4" />
          </Link>

          <ThemeToggle />

          <m.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="sm"
              onClick={() => scrollToSection("join")}
              className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all text-[10px] font-bold uppercase tracking-[0.15em] px-3 xl:px-5 h-9 xl:h-10 border border-primary/20 backdrop-blur-none"
            >
              <Sparkles className="size-3.5 mr-1.5 xl:mr-2" />
              JOIN
            </Button>
          </m.div>
        </div>

        {/* Mobile Menu - only on small screens */}
        <div className="flex lg:hidden items-center gap-2 z-10 flex-shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={openCommandPalette}
            aria-label="Search site"
            className="rounded-full bg-muted/50 hover:bg-muted border border-border/50 size-11 backdrop-blur-none text-muted-foreground hover:text-foreground"
          >
            <Search className="size-4" />
          </Button>
          <ThemeToggle />
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={isMenuOpen ? "Close Menu" : "Open Menu"}
                aria-expanded={isMenuOpen}
                className="relative rounded-full bg-muted/50 hover:bg-muted border border-border/50 size-12 overflow-hidden backdrop-blur-none"
              >
                <m.span
                  className="absolute inset-0 flex items-center justify-center"
                  animate={{ rotate: isMenuOpen ? 180 : 0, opacity: isMenuOpen ? 0 : 1, scale: isMenuOpen ? 0.5 : 1 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Menu className="size-5" />
                </m.span>
                <m.span
                  className="absolute inset-0 flex items-center justify-center"
                  animate={{ rotate: isMenuOpen ? 0 : -180, opacity: isMenuOpen ? 1 : 0, scale: isMenuOpen ? 1 : 0.5 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <X className="size-5" />
                </m.span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full sm:max-w-md h-full p-0 flex flex-col border-l border-white/10 [&>button]:hidden"
              style={{ background: "hsl(var(--background) / 0.85)", backdropFilter: "blur(24px) saturate(180%)" }}
            >
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SheetDescription className="sr-only">
                Primary site navigation with social links and a join call to action
              </SheetDescription>

              {/* ── Brand Header ── */}
              <m.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-5 border-b border-border/40"
              >
                <Link
                  to="/"
                  onClick={() => setIsMenuOpen(false)}
                  onMouseEnter={() => !isHomePage && prefetchRoute("/")}
                  onFocus={() => !isHomePage && prefetchRoute("/")}
                  className="flex items-center gap-3 group min-w-0 flex-1"
                >
                  <div className="size-11 shrink-0 overflow-hidden flex items-center justify-center bg-background/60 rounded-2xl p-1.5 border border-border/50 group-hover:border-primary/50 transition-all shadow-sm">
                    <OptimizedImage
                      src={clubLogo}
                      alt="YICDVP Logo"
                      width={35}
                      height={35}
                      className="size-full bg-transparent object-contain"
                    />
                  </div>
                  <div className="flex flex-col min-w-0 leading-[1.1] pt-[2px]">
                    <span className="font-display font-black text-xl lowercase tracking-tighter text-foreground group-hover:text-primary transition-colors truncate">
                      yicdvp
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mt-1 truncate">
                      est 2020
                    </span>
                  </div>
                </Link>
                <m.button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  aria-label="Close menu"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="shrink-0 size-11 rounded-full bg-muted/60 hover:bg-primary border border-border/50 hover:border-primary flex items-center justify-center text-muted-foreground hover:text-primary-foreground transition-colors duration-200"
                >
                  <X className="size-5" />
                </m.button>
              </m.div>

              {/* ── Nav Sections ── */}
              <nav className="flex-1 overflow-y-auto px-3 py-4 overscroll-contain" aria-label="Mobile Navigation">
                <m.div
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.04, delayChildren: 0.15 } },
                  }}
                  className="space-y-1"
                >
                  <m.p
                    variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}
                    className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70"
                  >
                    Explore
                  </m.p>
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = isHomePage
                      ? activeSection === item.id
                      : item.path?.includes("#")
                        ? location.hash === item.path.slice(item.path.indexOf("#"))
                        : item.path !== "/" && location.pathname === item.path;
                    return (
                      <m.div
                        key={item.id}
                        variants={{ hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0 } }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <button
                          onClick={() => handleNavClick(item)}
                          onMouseEnter={() => prefetchForItem(item)}
                          onFocus={() => prefetchForItem(item)}
                          aria-current={isActive ? "page" : undefined}
                          className={`group w-full flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-2xl text-left transition-all duration-200 ${
                            isActive
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "text-foreground/80 hover:bg-white/10 hover:border hover:border-white/20 hover:text-foreground active:scale-[0.98]"
                          }`}
                        >
                          <span
                            className={`flex items-center justify-center size-9 rounded-xl transition-all duration-200 group-hover:scale-110 ${
                              isActive
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                                : "bg-white/10 border border-white/10 text-muted-foreground group-hover:bg-white/20 group-hover:text-primary group-hover:border-white/20"
                            }`}
                          >
                            <Icon className="size-4" />
                          </span>
                          <span className="flex-1 font-semibold text-base tracking-tight">{item.label}</span>
                          {isActive && <span className="size-2 rounded-full bg-primary animate-pulse" />}
                          <ArrowRight
                            className={`size-4 transition-all ${
                              isActive
                                ? "text-primary translate-x-0"
                                : "text-muted-foreground/40 -translate-x-1 group-hover:translate-x-0 group-hover:text-foreground/70"
                            }`}
                          />
                        </button>
                      </m.div>
                    );
                  })}

                  <m.p
                    variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}
                    className="px-3 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70"
                  >
                    Learn
                  </m.p>

                  {[
                    {
                      to: "/learning-hub",
                      label: "STEM Hub",
                      icon: Cpu,
                      active: location.pathname === "/learning-hub",
                      prefetchKey: undefined as string | undefined,
                    },
                    {
                      to: "/news",
                      label: "News",
                      icon: Newspaper,
                      active: location.pathname.startsWith("/news"),
                      prefetchKey: "news-posts" as string | undefined,
                    },
                    {
                      to: "/blog",
                      label: "Blog",
                      icon: BookOpen,
                      active: location.pathname.startsWith("/blog"),
                      prefetchKey: "blog-posts" as string | undefined,
                    },
                    {
                      to: studentTarget,
                      label: isAuthenticated ? "My Dashboard" : "Student Portal",
                      icon: isAuthenticated ? UserCheck : GraduationCap,
                      active:
                        location.pathname.startsWith("/student") ||
                        location.pathname === "/learning-hub/my-learning",
                      prefetchKey: undefined as string | undefined,
                    },
                    {
                      to: "/verify",
                      label: "Verify Certificate",
                      icon: ShieldCheck,
                      active: location.pathname.startsWith("/verify"),
                      prefetchKey: undefined as string | undefined,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <m.div
                        key={item.to}
                        variants={{ hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0 } }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <Link
                          to={item.to}
                          onClick={() => setIsMenuOpen(false)}
                          onMouseEnter={() => {
                            prefetchRoute(item.to);
                            if (item.prefetchKey) prefetchData(item.prefetchKey);
                          }}
                          onFocus={() => {
                            prefetchRoute(item.to);
                            if (item.prefetchKey) prefetchData(item.prefetchKey);
                          }}
                          aria-current={item.active ? "page" : undefined}
                          className={`group w-full flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-2xl text-left transition-all duration-200 ${
                            item.active
                              ? "bg-primary/10 text-primary"
                              : "text-foreground/80 hover:bg-muted/60 hover:text-foreground active:scale-[0.98]"
                          }`}
                        >
                          <span
                            className={`flex items-center justify-center size-9 rounded-xl transition-all ${
                              item.active
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                                : "bg-muted/60 text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary"
                            }`}
                          >
                            <Icon className="size-4" />
                          </span>
                          <span className="flex-1 font-semibold text-base tracking-tight">{item.label}</span>
                          {item.active && <span className="size-2 rounded-full bg-primary animate-pulse" />}
                          <ArrowRight
                            className={`size-4 transition-all ${
                              item.active
                                ? "text-primary"
                                : "text-muted-foreground/40 -translate-x-1 group-hover:translate-x-0 group-hover:text-foreground/70"
                            }`}
                          />
                        </Link>
                      </m.div>
                    );
                  })}
                </m.div>
              </nav>

              {/* ── Bottom: Socials + Theme + CTA ── */}
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
                className="border-t border-border/40 px-5 pt-4 pb-6 space-y-4 bg-gradient-to-t from-background/40 to-transparent"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {socialLinks.map((social) => {
                      const Icon = social.icon;
                      return (
                        <a
                          key={social.label}
                          href={social.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={social.label}
                          className="size-11 rounded-xl bg-muted/50 hover:bg-primary border border-border/50 hover:border-primary flex items-center justify-center text-muted-foreground hover:text-primary-foreground transition-all duration-200 hover:scale-105 active:scale-95"
                        >
                          <Icon className="size-4" />
                        </a>
                      );
                    })}
                  </div>
                  <ThemeToggle />
                </div>

                <Button
                  size="lg"
                  onClick={() => {
                    scrollToSection("join");
                    setIsMenuOpen(false);
                  }}
                  className="w-full rounded-2xl text-sm py-6 shadow-xl shadow-primary/25 font-bold uppercase tracking-[0.2em] group bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/40 transition-all backdrop-blur-none"
                >
                  <Sparkles className="mr-2 size-4" />
                  join the club
                  <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </m.div>
            </SheetContent>
          </Sheet>
        </div>
      </HeaderLiquidGlass>
    </m.header>
  );
};

export default Header;
