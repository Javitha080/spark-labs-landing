// react-doctor-disable no-giant-component
import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, ArrowRight, Sparkles, Facebook, Instagram, Youtube, Home, Layers, Users, GraduationCap, Calendar, Image as ImageIcon, Mail, BookOpen, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import OptimizedImage from "@/components/ui/OptimizedImage";
import { ThemeToggle } from "@/components/admin/ThemeToggle";
import { clubLogo } from "@/components/ClubLogo";
import { m, useScroll, useMotionValueEvent } from "framer-motion";
import HeaderLiquidGlass from "@/components/effects/HeaderLiquidGlass";

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
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState("hero");
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === "/";

  const { scrollY } = useScroll();
  const isScrolled = scrollProgress > 50;

  // Track scroll position for header styling — always update so isScrolled works on initial load
  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrollProgress(latest);
  });

  // Robust Scroll Spy using IntersectionObserver to prevent reflows
  useEffect(() => {
    if (!isHomePage) return;

    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -65% 0px", // Focus on top third/center of screen
      threshold: 0
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

  const scrollToSection = useCallback((id: string) => {
    if (isHomePage) {
      const element = document.getElementById(id);
      if (element) {
        const offset = 100;
        const elementPosition = element.offsetTop;
        window.scrollTo({
          top: elementPosition - offset,
          behavior: "smooth"
        });
        setIsMenuOpen(false);
      }
    } else {
      setIsMenuOpen(false);
      navigate(`/#${id}`);
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isHomePage, navigate]);

  const handleNavClick = useCallback((item: MenuItem) => {
    if (item.path && !item.path.includes("#") && item.path !== "/") {
      navigate(item.path);
      setIsMenuOpen(false);
    } else {
      scrollToSection(item.id);
    }
  }, [navigate, scrollToSection]);

  return (
    <m.header
      className="fixed top-0 left-0 right-0 z-50 flex justify-center items-start pt-4 pointer-events-none"
      initial={{ opacity: 1, y: 0 }}
      animate={{ opacity: isMenuOpen ? 0 : 1, y: isMenuOpen ? -12 : 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{ pointerEvents: isMenuOpen ? "none" : "auto" }}
      role="banner"
    >
      <HeaderLiquidGlass
        isScrolled={isScrolled}
        className="relative flex items-center justify-between min-h-[56px] px-3 py-3 md:px-6 pointer-events-auto will-change-transform w-full"
      >
          {/* Logo Section */}
          <div className="flex items-center gap-4 flex-shrink min-w-0">
            <Link to="/" className="flex items-center gap-2 md:gap-4 group relative z-50 min-w-0" onClick={() => scrollToSection("hero")}>
              <div className="size-10 md:w-12 md:h-12 shrink-0 bg-background/50 backdrop-blur-md rounded-xl p-1.5 border border-border/50 group-hover:border-primary/50 transition-all shadow-sm">
                <OptimizedImage src={clubLogo} alt="YICDVP Logo" className="size-full bg-transparent object-contain drop-shadow-sm" priority />
              </div>
              <div className="flex flex-col min-w-0 shrink">
                <span className="font-display font-black text-lg leading-none lowercase tracking-tighter text-foreground group-hover:text-primary transition-colors truncate">
                  yicdvp
                </span>
                <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground group-hover:text-foreground transition-colors truncate">
                  est 2020
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation - visible from md breakpoint */}
          <nav className="hidden lg:flex items-center justify-center absolute left-1/2 -translate-x-1/2 z-10" style={{ position: 'absolute' }}>
            <ul className="relative flex items-center gap-1 p-1 rounded-full bg-background/40 backdrop-blur-md border border-border/50" role="menubar" aria-label="Main Navigation">
              {menuItems.map((item) => {
                const isActive = isHomePage
                  ? activeSection === item.id
                  : location.hash === item.path?.replace("/", "");

                return (
                  <li key={item.id} className="relative" role="presentation">
                    <m.button
                      role="menuitem"
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => handleNavClick(item)}
                      className={`relative px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] transition-all rounded-full ${isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
                          <div className="absolute inset-0 backdrop-blur-md bg-background/20" />
                          {/* Animated shimmer effect */}
                          <m.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
                            animate={{ x: ["-100%", "200%"] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                          />
                          {/* Glass edge highlight */}
                          <div className="absolute inset-0 rounded-full border border-primary-foreground/20" />
                          {/* Soft glow */}
                          <div className="absolute -inset-1 bg-primary/30 rounded-full blur-md -z-10" />
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
                  className={`relative px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] transition-all rounded-full flex items-center ${location.pathname === "/learning-hub"
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
                      <div className="absolute inset-0 backdrop-blur-md bg-background/20" />
                      <m.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                      />
                      <div className="absolute inset-0 rounded-full border border-primary-foreground/20" />
                      <div className="absolute -inset-1 bg-primary/30 rounded-full blur-md -z-10" />
                    </m.div>
                  )}
                  <span className="relative z-10">STEM</span>
                </Link>
              </li>
              <li className="relative" role="presentation">
                <Link
                  to="/blog"
                  role="menuitem"
                  aria-current={location.pathname.startsWith("/blog") ? "page" : undefined}
                  className={`relative px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] transition-all rounded-full flex items-center ${location.pathname.startsWith("/blog")
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
                      <div className="absolute inset-0 backdrop-blur-md bg-background/20" />
                      <m.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                      />
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
          <div className="hidden lg:flex items-center gap-3 z-10 flex-shrink-0">
            <ThemeToggle />
            <m.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="sm"
                onClick={() => scrollToSection("join")}
                className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all text-[10px] font-bold uppercase tracking-[0.15em] px-6 h-10 border border-primary/20"
              >
                <Sparkles className="size-3.5 mr-2" />
                JOIN
              </Button>
            </m.div>
          </div>

          {/* Mobile Menu - only on small screens */}
          <div className="flex lg:hidden items-center gap-2 z-10 flex-shrink-0">
            <ThemeToggle />
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={isMenuOpen ? "Close Menu" : "Open Menu"}
                  aria-expanded={isMenuOpen}
                  className="relative rounded-full bg-muted/50 hover:bg-muted border border-border/50 size-12 overflow-hidden"
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
                <SheetDescription className="sr-only">Primary site navigation with social links and a join call to action</SheetDescription>

                {/* ── Brand Header ── */}
                <m.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-5 border-b border-border/40"
                >
                  <Link to="/" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 group min-w-0 flex-1">
                    <div className="size-11 shrink-0 bg-background/60 backdrop-blur-md rounded-2xl p-1.5 border border-border/50 group-hover:border-primary/50 transition-all shadow-sm">
                      <OptimizedImage src={clubLogo} alt="YICDVP Logo" width={35} height={35} className="size-full bg-transparent object-contain" />
                    </div>
                    <div className="flex flex-col min-w-0 leading-[1.1] pt-[2px]">
                      <span className="font-display font-black text-xl lowercase tracking-tighter text-foreground group-hover:text-primary transition-colors truncate">
                        yicdvp
                      </span>
                      <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground mt-1 truncate">
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
                        : location.hash === item.path?.replace("/", "");
                      return (
                        <m.div
                          key={item.id}
                          variants={{ hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0 } }}
                          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <button
                            onClick={() => handleNavClick(item)}
                            aria-current={isActive ? "page" : undefined}
                            className={`group w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all duration-200 ${
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-foreground/80 hover:bg-muted/60 hover:text-foreground active:scale-[0.98]"
                            }`}
                          >
                            <span
                              className={`flex items-center justify-center size-9 rounded-xl transition-all ${
                                isActive
                                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                                  : "bg-muted/60 text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary"
                              }`}
                            >
                              <Icon className="size-4" />
                            </span>
                            <span className="flex-1 font-semibold text-base tracking-tight">{item.label}</span>
                            {isActive && <span className="size-2 rounded-full bg-primary animate-pulse" />}
                            <ArrowRight
                              className={`size-4 transition-all ${
                                isActive ? "text-primary translate-x-0" : "text-muted-foreground/40 -translate-x-1 group-hover:translate-x-0 group-hover:text-foreground/70"
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
                      { to: "/learning-hub", label: "STEM Hub", icon: Cpu, active: location.pathname === "/learning-hub" },
                      { to: "/blog", label: "Blog", icon: BookOpen, active: location.pathname.startsWith("/blog") },
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
                            aria-current={item.active ? "page" : undefined}
                            className={`group w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all duration-200 ${
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
                                item.active ? "text-primary" : "text-muted-foreground/40 -translate-x-1 group-hover:translate-x-0 group-hover:text-foreground/70"
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
                            className="size-10 rounded-xl bg-muted/50 hover:bg-primary border border-border/50 hover:border-primary flex items-center justify-center text-muted-foreground hover:text-primary-foreground transition-all duration-200 hover:scale-105 active:scale-95"
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
                    onClick={() => { scrollToSection("join"); setIsMenuOpen(false); }}
                    className="w-full rounded-2xl text-sm py-6 shadow-xl shadow-primary/25 font-bold uppercase tracking-[0.2em] group bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/40 transition-all"
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
