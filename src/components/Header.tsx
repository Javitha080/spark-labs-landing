import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import OptimizedImage from "@/components/ui/OptimizedImage";
import { ThemeToggle } from "@/components/admin/ThemeToggle";
import LiquidGlassProvider from "@/components/effects/LiquidGlassProvider";
import clubLogo from "@/assets/club-logo.png";
import { m, useScroll, useMotionValueEvent } from "framer-motion";

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

  const menuItems = [
    { id: "hero", label: "HOME" },
    { id: "features", label: "WHY US" },
    { id: "projects", label: "PROJECTS", path: "/#projects" }, // Fixed path
    { id: "team", label: "TEAM", path: "/#team" },
    { id: "teachers", label: "MENTORS", path: "/#teachers" },
    { id: "events", label: "EVENTS", path: "/#events" },
    { id: "gallery", label: "GALLERY", path: "/#gallery" },
    { id: "contact", label: "CONTACT", path: "/#contact" },
  ];

  const headerVariants = {
    initial: {
      width: "90%",
      maxWidth: "1185px",
      borderRadius: "9999px",
      y: 0,
      opacity: 1,
      backgroundColor: "rgba(var(--glass-bg-rgb, 10, 10, 20), 0.6)",
      backdropFilter: "blur(12px)",
    },
    scrolled: {
      width: "95%",
      maxWidth: "1300px",
      borderRadius: "24px",
      y: 0,
      opacity: 1,
      backgroundColor: "rgba(var(--glass-bg-rgb, 10, 10, 20), 0.85)",
      backdropFilter: "blur(20px)",
      boxShadow: "0 10px 30px -10px rgba(0,0,0,0.2)",
      transition: { type: "spring" as const, stiffness: 100, damping: 20 },
    },
  };

  return (
    <m.header
      className="fixed top-0 left-0 right-0 z-50 flex justify-center items-start pt-4 pointer-events-none"
      initial="initial"
      animate={isScrolled ? "scrolled" : "initial"}
      role="banner"
    >
      <m.div
        variants={headerVariants}
        className="relative flex items-center justify-between min-h-[56px] px-3 py-3 md:px-6 pointer-events-auto border border-border/50 overflow-hidden bg-background/80 backdrop-blur-md will-change-transform progressive-blur"
      >
        {/* Liquid Blur Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 opacity-50 blur-xl" />
          <div className="absolute top-0 left-1/4 size-32 bg-primary/30 rounded-full blur-3xl opacity-70" />
          <div className="absolute bottom-0 right-1/4 size-24 bg-secondary/30 rounded-full blur-2xl opacity-60" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-40 bg-accent/20 rounded-full blur-3xl opacity-50" />
        </div>

        {/* Logo Section */}
        <div className="flex items-center gap-4 flex-shrink min-w-0">
          <Link to="/" className="flex items-center gap-2 md:gap-4 group relative z-50 min-w-0" onClick={() => scrollToSection("hero")}>
            <div className="size-10 md:w-12 md:h-12 shrink-0 bg-background/50 backdrop-blur-md rounded-xl p-1.5 border border-border/50 group-hover:border-primary/50 transition-all shadow-sm">
              <OptimizedImage src={clubLogo} alt="YICDVP Logo" className="size-full object-contain drop-shadow-sm" priority />
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
          <LiquidGlassProvider config={{ blurAmount: 0.3, brightness: -0.1, button: true, cornerRadius: 9999 }}>
          <ul className="relative flex items-center gap-1 p-1 rounded-full bg-muted/50 border border-border/50 backdrop-blur-sm" role="menubar" aria-label="Main Navigation" style={{ position: 'relative' }} data-liquid-glass>
            {menuItems.map((item) => {
              const isActive = isHomePage
                ? activeSection === item.id
                : location.hash === item.path?.replace("/", "");

              return (
                <li key={item.id} className="relative" role="presentation">
                  <m.button
                    role="menuitem"
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => scrollToSection(item.id)}
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
          </LiquidGlassProvider>
        </nav>

        {/* Right Actions */}
        <div className="hidden lg:flex items-center gap-3 z-10 flex-shrink-0">
          <ThemeToggle />
          <LiquidGlassProvider config={{ blurAmount: 0.25, brightness: -0.05, button: true, cornerRadius: 9999 }}>
          <m.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} data-liquid-glass>
            <Button
              size="sm"
              onClick={() => scrollToSection("join")}
              className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all text-[10px] font-bold uppercase tracking-[0.15em] px-6 h-10 border border-primary/20"
            >
              <Sparkles className="size-3.5 mr-2" />
              JOIN
            </Button>
          </m.div>
          </LiquidGlassProvider>
        </div>

        {/* Mobile Menu - only on small screens */}
        <div className="flex lg:hidden items-center gap-2 z-10 flex-shrink-0">
          <ThemeToggle />
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open Menu" className="rounded-full bg-muted/50 hover:bg-muted border border-border/50 size-12">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="top" className="w-full h-screen border-none p-0 flex flex-col [&>button]:hidden" style={{ background: "rgba(var(--glass-bg-rgb, 10, 10, 20), 0.95)", backdropFilter: "blur(20px)" }}>
              <SheetHeader className="flex flex-row items-center justify-between p-6 border-b border-border/50 space-y-0 text-left">
                <SheetTitle className="flex items-center gap-3 m-0">
                  <div className="size-10 shrink-0 bg-background/50 backdrop-blur-md rounded-xl p-1.5 border border-border/50 shadow-sm">
                    <OptimizedImage src={clubLogo} alt="Logo" width={40} height={40} className="size-full object-contain" />
                  </div>
                  <span className="font-display font-bold text-xl lowercase">yicdvp</span>
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Navigation Menu
                </SheetDescription>
                <Button variant="ghost" size="icon" aria-label="Close Menu" onClick={() => setIsMenuOpen(false)} className="rounded-full bg-muted/50 hover:bg-muted border border-border/50 size-12 m-0 shrink-0">
                  <X className="size-5" />
                </Button>
              </SheetHeader>

              <div className="flex-1 flex flex-col justify-center items-center gap-6 p-6 overflow-y-auto">
                {menuItems.map((item, i) => (
                  <m.button
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 + 0.1 }}
                    onClick={() => scrollToSection(item.id)}
                    className={`text-2xl sm:text-3xl font-display font-black lowercase tracking-tighter ${isHomePage && activeSection === item.id ? "text-primary" : "text-muted-foreground hover:text-foreground"} transition-colors`}
                  >
                    {item.label.toLowerCase()}
                  </m.button>
                ))}

                <Link
                  to="/learning-hub"
                  onClick={() => setIsMenuOpen(false)}
                  className={`text-2xl sm:text-3xl font-display font-black lowercase tracking-tighter transition-colors ${location.pathname === "/learning-hub" ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                >
                  stem
                </Link>

                <Link
                  to="/blog"
                  onClick={() => setIsMenuOpen(false)}
                  className={`text-2xl sm:text-3xl font-display font-black lowercase tracking-tighter transition-colors ${location.pathname.startsWith("/blog") ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                >
                  blog
                </Link>

                <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-8 w-full max-w-xs">
                  <Button size="lg" onClick={() => scrollToSection("join")} className="w-full rounded-full text-sm py-8 shadow-xl shadow-primary/20 font-bold uppercase tracking-[0.2em]">
                    join the club <ArrowRight className="ml-2 size-5" />
                  </Button>
                </m.div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </m.div>
    </m.header>
  );
};

export default Header;
