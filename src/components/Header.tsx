import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/admin/ThemeToggle";
import clubLogo from "@/assets/club-logo.png";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    if (isHomePage) {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
        setIsMenuOpen(false);
      }
    } else {
      setIsMenuOpen(false);
      navigate(`/#${id}`);
    }
  };

  const menuItems = [
    { id: "hero", label: "Home" },
    { id: "features", label: "Why Us" },
    { id: "projects", label: "Projects" },
    { id: "team", label: "Team" },
    { id: "events", label: "Events" },
    { id: "contact", label: "Contact" },
  ];

  return (
    <header
      className={`fixed left-0 right-0 z-50 transition-all duration-300 ${scrolled
        ? "bg-background/80 backdrop-blur-md border-b border-border shadow-sm py-2"
        : "bg-transparent py-4"
        }`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm group-hover:shadow-md transition-all bg-white p-1">
            <img
              src={clubLogo}
              alt="YICDVP Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-lg leading-none uppercase tracking-tight text-foreground">YICDVP</span>
            <span className="font-mono text-[10px] leading-tight text-muted-foreground uppercase">Dharmapala</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-6">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className="font-medium text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {item.label}
            </button>
          ))}
          <Link
            to="/blog"
            className="font-medium text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Blog
          </Link>

          <ThemeToggle />

          <Button
            className="rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
            onClick={() => scrollToSection("join")}
          >
            Join <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </nav>

        {/* Mobile Toggle */}
        <div className="flex items-center gap-4 lg:hidden">
          <ThemeToggle />
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetTitle className="sr-only">Menu</SheetTitle> {/* Accessibility Fix */}
              <div className="flex flex-col h-full py-6">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                    Y
                  </div>
                  <span className="font-display font-bold text-xl uppercase">Menu</span>
                </div>
                <nav className="flex flex-col gap-4">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className="text-left font-display font-medium text-xl hover:text-primary transition-colors py-2 border-b border-border/50"
                    >
                      {item.label}
                    </button>
                  ))}
                  <Link
                    to="/blog"
                    onClick={() => setIsMenuOpen(false)}
                    className="text-left font-display font-medium text-xl hover:text-primary transition-colors py-2 border-b border-border/50"
                  >
                    Blog
                  </Link>
                  <Button
                    className="mt-6 w-full rounded-full"
                    onClick={() => scrollToSection("join")}
                  >
                    Join the Club
                  </Button>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
