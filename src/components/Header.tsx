import { useState, useEffect } from "react";
import { Menu, X, Sun, Moon, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", !isDark ? "dark" : "light");
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setIsMenuOpen(false);
  };

  const menuItems = ["Home", "About", "Projects", "Team", "Events", "Gallery", "Join", "Contact"];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "backdrop-blur-xl bg-background/80 border-b border-border/50" : "bg-transparent"}`}>
      <nav className="container mx-auto h-20 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-lg text-foreground">Young Innovators Club</span>
        </div>

        <div className="hidden lg:flex items-center gap-1">
          {menuItems.map((item) => (
            <button key={item} onClick={() => scrollToSection(item.toLowerCase())} className="px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
              {item}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
          <Button className="hidden lg:inline-flex" onClick={() => scrollToSection("join")}>Join Us</Button>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
      </nav>

      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-20 bg-background/95 backdrop-blur-xl">
          <div className="container mx-auto px-6 py-8 space-y-4">
            {menuItems.map((item) => (
              <button key={item} onClick={() => scrollToSection(item.toLowerCase())} className="block w-full text-left px-4 py-3 text-lg font-medium text-foreground hover:text-primary transition-colors">
                {item}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
