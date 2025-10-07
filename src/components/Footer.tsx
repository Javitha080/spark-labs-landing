import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const Footer = () => {
  const { toast } = useToast();

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Subscribed! 🎉",
      description: "You'll receive updates about our innovation journey.",
    });
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-card border-t border-border">
      {/* Newsletter */}
      <div className="section-padding bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-3xl font-bold mb-4 gradient-text">Stay Updated on Innovation</h3>
            <p className="text-muted-foreground mb-6">
              Subscribe to receive updates about workshops, events, and student achievements
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex gap-3 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your email"
                required
                className="flex-1"
              />
              <Button type="submit" variant="hero">
                Subscribe
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container-custom py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* About */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">YIC</span>
              </div>
              <span className="font-bold">Young Innovators Club</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Cultivating young innovators through hands-on STEM education at Dharmapala Vidyalaya, Pannipitiya.
            </p>
            <div className="flex gap-2">
              <div className="glass-card px-3 py-1 rounded-lg text-sm">50+ Projects</div>
              <div className="glass-card px-3 py-1 rounded-lg text-sm">100+ Members</div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold mb-4">Quick Links</h4>
            <div className="space-y-2">
              <button onClick={() => scrollToSection("about")} className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                About Us
              </button>
              <button onClick={() => scrollToSection("projects")} className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                Projects
              </button>
              <button onClick={() => scrollToSection("events")} className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                Events
              </button>
              <button onClick={() => scrollToSection("gallery")} className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                Gallery
              </button>
              <button onClick={() => scrollToSection("join")} className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                Join Us
              </button>
              <button onClick={() => scrollToSection("contact")} className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                Contact
              </button>
            </div>
          </div>

          {/* Innovation Categories */}
          <div>
            <h4 className="font-bold mb-4">Innovation Areas</h4>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Solar Energy</div>
              <div className="text-sm text-muted-foreground">Robotics</div>
              <div className="text-sm text-muted-foreground">Environmental Science</div>
              <div className="text-sm text-muted-foreground">Programming</div>
              <div className="text-sm text-muted-foreground">Design & Engineering</div>
            </div>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-bold mb-4">Connect With Us</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Dharmapala Vidyalaya<br />
              Pannipitiya, Sri Lanka
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Email: innovators@dharmapala.edu.lk<br />
              Phone: +94 XX XXX XXXX
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground text-center md:text-left">
              © 2025 Young Innovators Club - Dharmapala Vidyalaya. All rights reserved.
            </p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </div>

      {/* Back to Top Button */}
      <Button
        onClick={scrollToTop}
        variant="hero"
        size="icon"
        className="fixed bottom-8 right-8 rounded-full shadow-lg z-40"
        aria-label="Back to top"
      >
        <Rocket className="w-5 h-5 rotate-[-45deg]" />
      </Button>

      {/* Marquee */}
      <div className="bg-gradient-to-r from-primary via-secondary to-accent overflow-hidden">
        <div className="py-3 animate-[marquee_20s_linear_infinite] whitespace-nowrap">
          <span className="text-white text-sm font-medium inline-block px-4">
            🚀 Dharmapala Vidyalaya is cultivating future innovators and engineers 🔬 Join us on this exciting journey 🌟
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
