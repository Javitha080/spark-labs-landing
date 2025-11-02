import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Sun, Moon } from "lucide-react";
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

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass-card shadow-lg" : "bg-transparent"
      }`}
    >
      <nav className="container-custom py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">YIC</span>
            </div>
            <div className="hidden md:block">
              <h2 className="font-bold text-lg gradient-text">Young Innovators Club</h2>
              <p className="text-xs text-muted-foreground">Dharmapala Vidyalaya</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-6">
            <button onClick={() => scrollToSection("hero")} className="text-foreground hover:text-primary transition-colors">
              Home
            </button>
            <button onClick={() => scrollToSection("about")} className="text-foreground hover:text-primary transition-colors">
              About
            </button>
            <button onClick={() => scrollToSection("projects")} className="text-foreground hover:text-primary transition-colors">
              Projects
            </button>
            <button onClick={() => scrollToSection("team")} className="text-foreground hover:text-primary transition-colors">
              Team
            </button>
            <button onClick={() => scrollToSection("events")} className="text-foreground hover:text-primary transition-colors">
              Events
            </button>
            <button onClick={() => scrollToSection("gallery")} className="text-foreground hover:text-primary transition-colors">
              Gallery
            </button>
            <Link to="/blog" className="text-foreground hover:text-primary transition-colors">
              Blog
            </Link>
            <button onClick={() => scrollToSection("contact")} className="text-foreground hover:text-primary transition-colors">
              Contact
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            <Button
              onClick={() => scrollToSection("join")}
              variant="hero"
              size="sm"
              className="hidden md:inline-flex"
            >
              Join Us
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden mt-4 glass-card p-6 rounded-lg animate-fade-in">
            <div className="flex flex-col space-y-4">
              <button onClick={() => scrollToSection("hero")} className="text-left hover:text-primary transition-colors">
                Home
              </button>
              <button onClick={() => scrollToSection("about")} className="text-left hover:text-primary transition-colors">
                About
              </button>
              <button onClick={() => scrollToSection("projects")} className="text-left hover:text-primary transition-colors">
                Projects
              </button>
              <button onClick={() => scrollToSection("team")} className="text-left hover:text-primary transition-colors">
                Team
              </button>
              <button onClick={() => scrollToSection("events")} className="text-left hover:text-primary transition-colors">
                Events
              </button>
              <button onClick={() => scrollToSection("gallery")} className="text-left hover:text-primary transition-colors">
                Gallery
              </button>
              <Link to="/blog" className="text-left hover:text-primary transition-colors" onClick={() => setIsMenuOpen(false)}>
                Blog
              </Link>
              <button onClick={() => scrollToSection("contact")} className="text-left hover:text-primary transition-colors">
                Contact
              </button>
              <Button onClick={() => scrollToSection("join")} variant="hero" className="w-full">
                Join Us
              </Button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
