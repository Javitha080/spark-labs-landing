import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/admin/ThemeToggle";
import clubLogo from "@/assets/club-logo.png";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState("hero");
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === "/";

  const { scrollY } = useScroll();
  const isScrolled = scrollProgress > 50;

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrollProgress(latest);
  });

  // Robust Scroll Spy using Viewport Center Detection
  useEffect(() => {
    if (!isHomePage) return;

    const handleScroll = () => {
      const sections = ["hero", "features", "projects", "team", "teachers", "events", "gallery", "contact"];
      const viewportCenter = window.innerHeight / 3; // Trigger earlier (top third)

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          const offsetTop = rect.top;
          const offsetBottom = rect.bottom;

          // Check if section overlaps the viewport center
          if (offsetTop <= viewportCenter && offsetBottom >= viewportCenter) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHomePage]);

  const scrollToSection = useCallback((id: string) => {
    if (isHomePage) {
      const element = document.getElementById(id);
      if (element) {
        const offset = 100;
        const elementPosition = element.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
          top: elementPosition - offset,
          behavior: "smooth"
        });
        setIsMenuOpen(false);
      }
    } else {
      setIsMenuOpen(false);
      // Navigate to homepage with hash
      navigate(`/#${id}`);
      // Fallback for immediate scroll if navigate instant
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
      maxWidth: "1100px",
      borderRadius: "9999px",
      y: 20,
      backgroundColor: "rgba(var(--glass-bg-rgb, 10, 10, 20), 0.6)",
      backdropFilter: "blur(12px)",
    },
    scrolled: {
      width: "95%",
      maxWidth: "1300px",
      borderRadius: "24px",
      y: 10,
      backgroundColor: "rgba(var(--glass-bg-rgb, 10, 10, 20), 0.85)",
      backdropFilter: "blur(20px)",
      boxShadow: "0 10px 30px -10px rgba(0,0,0,0.2)",
      transition: { type: "spring" as const, stiffness: 100, damping: 20 },
    },
  };

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 flex justify-center items-start pt-4 pointer-events-none"
      initial="initial"
      animate={isScrolled ? "scrolled" : "initial"}
    >
      <motion.div
        variants={headerVariants}
        className="relative flex items-center justify-between px-4 py-3 md:px-6 pointer-events-auto border border-white/10 overflow-hidden"
      >
        {/* Logo Section */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-3 group flex-shrink-0 z-10" onClick={() => scrollToSection("hero")}>
            <motion.div
              className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 backdrop-blur-md p-1.5 border border-white/10 group-hover:border-primary/50 transition-all shadow-inner"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <img src={clubLogo} alt="YICDVP Logo" className="w-full h-full object-contain drop-shadow-sm" />
            </motion.div>

            <div className="flex flex-col hidden sm:flex">
              <span className="font-display font-black text-lg leading-none lowercase tracking-tighter text-foreground group-hover:text-primary transition-colors">
                yicdvp
              </span>
              <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground/80 group-hover:text-foreground/70 transition-colors">
                est 2020
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center justify-center absolute left-1/2 -translate-x-1/2">
          <ul className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm">
            {menuItems.map((item) => {
              const isActive = isHomePage
                ? activeSection === item.id
                : location.hash === item.path?.replace("/", "");

              return (
                <li key={item.id}>
                  <motion.button
                    onClick={() => scrollToSection(item.id)}
                    className={`relative px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] transition-all rounded-full ${isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                      }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-pill"
                        className="absolute inset-0 bg-primary rounded-full shadow-lg shadow-primary/25"
                        transition={{ type: "spring" as const, stiffness: 300, damping: 25 }}
                      />
                    )}
                    <span className="relative z-10">{item.label}</span>
                  </motion.button>
                </li>
              );
            })}

            <li>
              <Link
                to="/stem-learning-hub"
                className={`relative px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] transition-all rounded-full flex items-center ${location.pathname === "/stem-learning-hub"
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
              >
                {location.pathname === "/stem-learning-hub" && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 bg-primary rounded-full shadow-lg shadow-primary/25"
                    transition={{ type: "spring" as const, stiffness: 300, damping: 25 }}
                  />
                )}
                <span className="relative z-10">STEM</span>
              </Link>
            </li>
            <li>
              <Link
                to="/blog"
                className={`relative px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] transition-all rounded-full flex items-center ${location.pathname.startsWith("/blog")
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
              >
                {location.pathname.startsWith("/blog") && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 bg-primary rounded-full shadow-lg shadow-primary/25"
                    transition={{ type: "spring" as const, stiffness: 300, damping: 25 }}
                  />
                )}
                <span className="relative z-10">BLOG</span>
              </Link>
            </li>
          </ul>
        </nav>

        {/* Right Actions */}
        <div className="hidden lg:flex items-center gap-3 z-10">
          <ThemeToggle />
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="sm"
              onClick={() => scrollToSection("join")}
              className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all text-[10px] font-bold uppercase tracking-[0.15em] px-6 h-10 border border-primary/20"
            >
              <Sparkles className="w-3.5 h-3.5 mr-2" />
              JOIN
            </Button>
          </motion.div>
        </div>

        {/* Mobile Menu */}
        <div className="flex lg:hidden items-center gap-3 z-10">
          <ThemeToggle />
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full bg-white/5 hover:bg-white/10 border border-white/10 w-10 h-10">
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="top" className="w-full h-screen border-none p-0 flex flex-col" style={{ background: "rgba(var(--glass-bg-rgb, 10, 10, 20), 0.95)", backdropFilter: "blur(20px)" }}>
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <Link to="/" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3">
                  <img src={clubLogo} alt="Logo" className="w-10 h-10 object-contain" />
                  <div className="flex flex-col">
                    <span className="font-display font-black lowercase text-2xl tracking-tighter block">yicdvp</span>
                  </div>
                </Link>
                <Button variant="ghost" size="icon" className="rounded-full bg-white/5 hover:bg-white/10" onClick={() => setIsMenuOpen(false)}>
                  <X className="w-6 h-6" />
                </Button>
              </div>

              <div className="flex-1 flex flex-col justify-center items-center gap-6 p-6 overflow-y-auto">
                {menuItems.map((item, i) => (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 + 0.1 }}
                    onClick={() => scrollToSection(item.id)}
                    className={`text-4xl font-display font-black lowercase tracking-tighter ${activeSection === item.id ? "text-primary" : "text-muted-foreground hover:text-foreground"} transition-colors`}
                  >
                    {item.label.toLowerCase()}
                  </motion.button>
                ))}

                <Link
                  to="/stem-learning-hub"
                  onClick={() => setIsMenuOpen(false)}
                  className="text-4xl font-display font-black lowercase tracking-tighter text-muted-foreground hover:text-primary transition-colors"
                >
                  stem
                </Link>

                <Link
                  to="/blog"
                  onClick={() => setIsMenuOpen(false)}
                  className="text-4xl font-display font-black lowercase tracking-tighter text-muted-foreground hover:text-primary transition-colors"
                >
                  blog
                </Link>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-8 w-full max-w-xs">
                  <Button size="lg" onClick={() => scrollToSection("join")} className="w-full rounded-full text-sm py-8 shadow-xl shadow-primary/20 font-bold uppercase tracking-[0.2em]">
                    join the club <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </motion.div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </motion.div>
    </motion.header>
  );
};

export default Header;
