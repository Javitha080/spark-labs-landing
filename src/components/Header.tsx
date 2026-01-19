import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Sun, Moon, Home, Info, Briefcase, Users, Calendar, Image, BookOpen, Mail, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollProgress } from "@/components/animation/ScrollProgress";
import clubLogo from "@/assets/club-logo.png";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else if (saved === "light") {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    } else {
      // Check system preference if no saved theme
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDark(prefersDark);
      if (prefersDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);

    if (newIsDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const scrollToSection = (id: string) => {
    if (isHomePage) {
      // If on home page, scroll to section
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
        setIsMenuOpen(false);
      }
    } else {
      // If on another page, navigate to home with hash
      setIsMenuOpen(false);
      navigate(`/#${id}`);
    }
  };

  const menuItems = [
    { id: "hero", label: "Home", icon: Home },
    { id: "about", label: "About", icon: Info },
    { id: "projects", label: "Projects", icon: Briefcase },
    { id: "team", label: "Team", icon: Users },
    { id: "events", label: "Events", icon: Calendar },
    { id: "gallery", label: "Gallery", icon: Image },
    { id: "contact", label: "Contact", icon: Mail },
  ];

  return (
    <>
      <ScrollProgress />
      <header
        className={`fixed left-0 right-0 z-50 transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${scrolled
          ? "top-5 sm:top-8"
          : "top-0"
          }`}
      >
        <nav className={`mx-auto transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${scrolled
          ? "w-[90%] sm:w-[94%] max-w-7xl rounded-full h-14 sm:h-16 bg-background/50 dark:bg-background/30 backdrop-blur-[100px] backdrop-saturate-[300%] border border-white/30 dark:border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(0,0,0,0.2)] ring-1 ring-primary/5 dark:ring-white/10 hover:ring-primary/20 dark:hover:ring-primary/30 hover:shadow-[0_8px_40px_rgba(var(--primary-rgb),0.15),0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.15)]"
          : "container-custom h-20 md:h-24 bg-transparent border-0"
          }`}>
          <div className="flex items-center justify-between h-full px-2 sm:px-4 md:px-6">
            {/* Logo */}
            <Link
              to="/"
              className={`flex items-center gap-2 sm:gap-3 transition-all duration-300 ${scrolled ? "scale-90" : "scale-100"
                }`}
            >
              <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl overflow-hidden shadow-lg ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                  <img
                    src={clubLogo}
                    alt="Young Innovators Club Logo"
                    className="w-full h-full object-cover"
                    {...({ fetchpriority: "high" } as any)}
                    loading="eager"
                    width="48"
                    height="48"
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <h2 className="font-display font-bold text-xs sm:text-sm md:text-lg leading-tight whitespace-nowrap group-hover:scale-[1.02] transition-transform duration-300 origin-left">
                  <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent" style={{ WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    Young Innovators Club
                  </span>
                </h2>
                <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">Dharmapala Vidyalaya</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="nav-link relative px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  {item.label}
                </button>
              ))}
              <Link
                to="/blog"
                className="nav-link relative px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                Blog
              </Link>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full hover:bg-primary/10"
                aria-label="Toggle theme"
              >
                {isDark ? (
                  <Sun className="h-5 w-5 rotate-0 transition-transform duration-300" />
                ) : (
                  <Moon className="h-5 w-5 rotate-0 transition-transform duration-300" />
                )}
              </Button>

              <Button
                onClick={() => scrollToSection("join")}
                className="hidden md:inline-flex btn-glow"
                size="sm"
              >
                Join Us
              </Button>

              {/* Modern Hamburger Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden relative p-2 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 border border-primary/20 transition-all duration-300 group"
                aria-label="Toggle menu"
                aria-expanded={isMenuOpen}
              >
                <div className="relative w-5 h-5 flex items-center justify-center">
                  {isMenuOpen ? (
                    <X className="w-5 h-5 text-primary transition-all duration-300" />
                  ) : (
                    <Menu className="w-5 h-5 text-primary transition-all duration-300" />
                  )}
                </div>
                {/* Glow effect on hover */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/30 to-secondary/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Modern Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-all duration-500 ${isMenuOpen ? "visible" : "invisible pointer-events-none"
          }`}
      >
        {/* Enhanced Glassmorphism Backdrop */}
        <div
          className={`absolute inset-0 backdrop-blur-2xl bg-gradient-to-br from-background/98 via-background/95 to-muted/90 transition-all duration-500 ${isMenuOpen ? "opacity-100" : "opacity-0"
            }`}
          onClick={() => setIsMenuOpen(false)}
        >
          {/* Animated background orbs */}
          <div className="absolute top-20 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-48 h-48 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '-2s' }} />
          <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-accent/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '-4s' }} />
        </div>

        {/* Menu Content Panel */}
        <div
          className={`absolute right-0 top-0 h-full w-full sm:w-96 bg-gradient-to-b from-card/80 via-background/90 to-muted/80 backdrop-blur-xl shadow-2xl border-l border-primary/10 transition-all duration-500 ease-out ${isMenuOpen ? "translate-x-0" : "translate-x-full"
            }`}
        >
          {/* Decorative top gradient bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent" />

          <div className="flex flex-col h-full p-6 pt-28 overflow-y-auto">
            {/* Close indicator */}
            <div className="absolute top-6 right-6">
              <span className="text-xs text-muted-foreground">Tap outside to close</span>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 space-y-1.5">
              {menuItems.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gradient-to-r hover:from-primary/10 hover:to-secondary/5 transition-all duration-300 group border border-transparent hover:border-primary/20 ${isMenuOpen ? "animate-slide-in-right opacity-100" : "opacity-0"
                    }`}
                  style={{
                    animationDelay: `${index * 60}ms`,
                    animationFillMode: 'backwards'
                  }}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center group-hover:from-primary/30 group-hover:to-secondary/20 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/25">
                    <item.icon className="w-5 h-5 text-primary group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-lg font-semibold group-hover:text-primary transition-colors">{item.label}</span>
                  </div>
                  <Zap className="w-4 h-4 ml-auto text-primary/0 group-hover:text-primary/60 transition-all group-hover:translate-x-1" />
                </button>
              ))}

              {/* Blog Link */}
              <Link
                to="/blog"
                onClick={() => setIsMenuOpen(false)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gradient-to-r hover:from-primary/10 hover:to-secondary/5 transition-all duration-300 group border border-transparent hover:border-primary/20 ${isMenuOpen ? "animate-slide-in-right opacity-100" : "opacity-0"
                  }`}
                style={{
                  animationDelay: `${menuItems.length * 60}ms`,
                  animationFillMode: 'backwards'
                }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center group-hover:from-primary/30 group-hover:to-secondary/20 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/25">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-lg font-semibold group-hover:text-primary transition-colors">Blog</span>
                </div>
                <Zap className="w-4 h-4 ml-auto text-primary/0 group-hover:text-primary/60 transition-all group-hover:translate-x-1" />
              </Link>
            </nav>

            {/* CTA Button */}
            <div className={`${isMenuOpen ? "animate-slide-in-right" : "opacity-0"}`} style={{ animationDelay: `${(menuItems.length + 1) * 60}ms`, animationFillMode: 'backwards' }}>
              <Button
                onClick={() => {
                  scrollToSection("join");
                  setIsMenuOpen(false);
                }}
                className="w-full btn-glow bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-lg py-6 rounded-2xl shadow-lg shadow-primary/25"
                size="lg"
              >
                <Zap className="w-5 h-5 mr-2" />
                Join Our Club
              </Button>
            </div>

            {/* Social Links with SVG Icons */}
            <div className={`mt-6 pt-6 border-t border-primary/10 ${isMenuOpen ? "animate-slide-in-right" : "opacity-0"}`} style={{ animationDelay: `${(menuItems.length + 2) * 60}ms`, animationFillMode: 'backwards' }}>
              <p className="text-xs text-muted-foreground text-center mb-4 font-medium uppercase tracking-wider">
                Connect with us
              </p>
              <div className="flex justify-center gap-4">
                {[
                  { name: "facebook", icon: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
                  { name: "instagram", icon: "M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" },
                  { name: "youtube", icon: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" },
                  { name: "twitter", icon: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" }
                ].map((social) => (
                  <a
                    key={social.name}
                    href={`https://${social.name}.com`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-11 h-11 rounded-xl bg-gradient-to-br from-muted to-muted/50 hover:from-primary hover:to-secondary transition-all duration-300 flex items-center justify-center group shadow-sm hover:shadow-lg hover:shadow-primary/25 hover:scale-110"
                    aria-label={social.name}
                  >
                    <svg
                      className="w-5 h-5 fill-muted-foreground group-hover:fill-white transition-colors"
                      viewBox="0 0 24 24"
                    >
                      <path d={social.icon} />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;

