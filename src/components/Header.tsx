import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Sun, Moon, Home, Info, Briefcase, Users, Calendar, Image, BookOpen, Mail, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
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
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMenuOpen(false);
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
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled 
            ? "h-16 md:h-20 backdrop-blur-xl bg-background/80 shadow-lg border-b border-border/50" 
            : "h-20 md:h-24 bg-transparent"
        }`}
      >
        <nav className="container mx-auto h-full px-4 md:px-6">
          <div className="flex items-center justify-between h-full">
            {/* Logo */}
            <div 
              className={`flex items-center gap-3 transition-all duration-300 ${
                scrolled ? "scale-90" : "scale-100"
              }`}
            >
              <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary via-secondary to-accent rounded-xl flex items-center justify-center shadow-lg">
                  <Zap className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
              </div>
              <div className="hidden sm:block">
                <h2 className="font-display font-bold text-base md:text-lg gradient-text leading-tight">
                  Young Innovators Club
                </h2>
                <p className="text-xs text-muted-foreground">Dharmapala Vidyalaya</p>
              </div>
            </div>

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

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-muted/50 transition-colors"
                aria-label="Toggle menu"
              >
                <div className="relative w-6 h-6">
                  <span
                    className={`absolute left-0 top-1 w-6 h-0.5 bg-foreground transition-all duration-300 ${
                      isMenuOpen ? "rotate-45 top-2.5" : ""
                    }`}
                  />
                  <span
                    className={`absolute left-0 top-2.5 w-6 h-0.5 bg-foreground transition-all duration-300 ${
                      isMenuOpen ? "opacity-0" : ""
                    }`}
                  />
                  <span
                    className={`absolute left-0 top-4 w-6 h-0.5 bg-foreground transition-all duration-300 ${
                      isMenuOpen ? "-rotate-45 top-2.5" : ""
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-all duration-300 ${
          isMenuOpen ? "visible" : "invisible"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 backdrop-blur-xl bg-background/95 transition-opacity duration-300 ${
            isMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsMenuOpen(false)}
        />

        {/* Menu Content */}
        <div
          className={`absolute right-0 top-0 h-full w-full sm:w-80 bg-gradient-to-b from-background to-muted/30 shadow-2xl transition-transform duration-300 ${
            isMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full p-6 pt-24">
            {/* Menu Items */}
            <nav className="flex-1 space-y-2">
              {menuItems.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`mobile-menu-item w-full flex items-center gap-4 p-4 rounded-xl hover:bg-primary/10 transition-all group ${
                    isMenuOpen ? "animate-slide-in-right" : ""
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-lg font-medium">{item.label}</span>
                </button>
              ))}
              <Link
                to="/blog"
                onClick={() => setIsMenuOpen(false)}
                className={`mobile-menu-item w-full flex items-center gap-4 p-4 rounded-xl hover:bg-primary/10 transition-all group ${
                  isMenuOpen ? "animate-slide-in-right" : ""
                }`}
                style={{ animationDelay: `${menuItems.length * 50}ms` }}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <span className="text-lg font-medium">Blog</span>
              </Link>
            </nav>

            {/* CTA Button */}
            <Button
              onClick={() => {
                scrollToSection("join");
                setIsMenuOpen(false);
              }}
              className="w-full btn-glow"
              size="lg"
            >
              Join Our Club
            </Button>

            {/* Social Links */}
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground text-center mb-4">
                Follow us for updates
              </p>
              <div className="flex justify-center gap-3">
                {["facebook", "instagram", "youtube", "twitter"].map((social) => (
                  <button
                    key={social}
                    className="w-10 h-10 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
                    aria-label={social}
                  >
                    <span className="text-xs font-semibold uppercase">{social[0]}</span>
                  </button>
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
