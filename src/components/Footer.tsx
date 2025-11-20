import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ArrowUp, Facebook, Instagram, Mail, MapPin, Phone, Send, Twitter, Youtube } from "lucide-react";
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
    <footer className="relative bg-background/50 backdrop-blur-xl border-t border-border/50">
      {/* Newsletter Section - Modern Card Design */}
      <div className="section-padding relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10" />
        <div className="container-custom relative z-10">
          <div className="max-w-3xl mx-auto glass-card p-8 sm:p-10 rounded-3xl shadow-xl border border-white/20 transform hover:scale-[1.01] transition-all duration-300">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-full blur-3xl -z-10"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-secondary/30 to-accent/30 rounded-full blur-3xl -z-10"></div>

            <h3 className="text-3xl sm:text-4xl font-bold mb-4 text-center">
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent" style={{ WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Stay Connected
              </span>
            </h3>
            <p className="text-muted-foreground mb-8 text-center max-w-xl mx-auto">
              Join our innovation community and receive updates about workshops, events, and student achievements
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="email"
                  placeholder="Enter your email"
                  required
                  className="pl-10 bg-background/80 backdrop-blur-sm border-white/20 h-12 rounded-xl"
                />
              </div>
              <Button type="submit" variant="hero" size="lg" className="h-12 rounded-xl group">
                Subscribe
                <Send className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer - Enhanced Layout */}
      <div className="container-custom py-16 glass-card rounded-t-3xl mt-8 border-t border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-full blur-3xl -z-10"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* About - Enhanced Branding */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">YIC</span>
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Young Innovators Club</span>
            </div>
            <p className="text-muted-foreground">
              Cultivating young innovators through hands-on STEM education at Dharmapala Vidyalaya, Pannipitiya.
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="glass-card px-4 py-2 rounded-xl text-sm backdrop-blur-md border border-white/10 hover:border-primary/30 transition-colors">
                50+ Projects
              </div>
              <div className="glass-card px-4 py-2 rounded-xl text-sm backdrop-blur-md border border-white/10 hover:border-primary/30 transition-colors">
                100+ Members
              </div>
            </div>

            {/* Social Media Icons */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" size="icon" className="rounded-full w-9 h-9 bg-background/50 hover:bg-primary hover:text-primary-foreground transition-colors">
                <Facebook className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="rounded-full w-9 h-9 bg-background/50 hover:bg-primary hover:text-primary-foreground transition-colors">
                <Twitter className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="rounded-full w-9 h-9 bg-background/50 hover:bg-primary hover:text-primary-foreground transition-colors">
                <Instagram className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="rounded-full w-9 h-9 bg-background/50 hover:bg-primary hover:text-primary-foreground transition-colors">
                <Youtube className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick Links - Interactive Buttons */}
          <div>
            <h4 className="font-bold text-lg mb-6 relative">
              Quick Links
              <span className="absolute -bottom-2 left-0 w-12 h-1 bg-gradient-to-r from-primary to-secondary rounded-full"></span>
            </h4>
            <div className="space-y-3">
              {[
                { name: "About Us", id: "about" },
                { name: "Projects", id: "projects" },
                { name: "Events", id: "events" },
                { name: "Gallery", id: "gallery" },
                { name: "Join Us", id: "join" },
                { name: "Contact", id: "contact" }
              ].map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  className="block text-muted-foreground hover:text-primary transition-colors group flex items-center"
                >
                  <span className="w-0 h-[1px] bg-primary mr-0 group-hover:w-3 group-hover:mr-2 transition-all duration-300"></span>
                  {link.name}
                </button>
              ))}
            </div>
          </div>

          {/* Innovation Categories - Visual Enhancement */}
          <div>
            <h4 className="font-bold text-lg mb-6 relative">
              Innovation Areas
              <span className="absolute -bottom-2 left-0 w-12 h-1 bg-gradient-to-r from-primary to-secondary rounded-full"></span>
            </h4>
            <div className="space-y-3">
              {[
                "Solar Energy",
                "Robotics",
                "Environmental Science",
                "Programming",
                "Design & Engineering"
              ].map((area) => (
                <div key={area} className="flex items-center gap-2 group">
                  <div className="w-2 h-2 rounded-full bg-secondary group-hover:bg-primary transition-colors"></div>
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors">{area}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Connect - Contact Information with Icons */}
          <div>
            <h4 className="font-bold text-lg mb-6 relative">
              Connect With Us
              <span className="absolute -bottom-2 left-0 w-12 h-1 bg-gradient-to-r from-primary to-secondary rounded-full"></span>
            </h4>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-foreground">Dharmapala Vidyalaya</p>
                  <p className="text-muted-foreground">Pannipitiya, Sri Lanka</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary" />
                <a href="mailto:innovators@dharmapala.edu.lk" className="text-muted-foreground hover:text-primary transition-colors">
                  innovators@dharmapala.edu.lk
                </a>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary" />
                <a href="tel:+94XXXXXXXX" className="text-muted-foreground hover:text-primary transition-colors">
                  +94 XX XXX XXXX
                </a>
              </div>
            </div>
          </div>
        </div>

        <Separator className="mb-8 bg-border/50" />

        {/* Bottom Bar - Improved Layout */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-muted-foreground text-center md:text-left">
            © 2025 Young Innovators Club - Dharmapala Vidyalaya. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors relative group">
              Privacy Policy
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-primary group-hover:w-full transition-all duration-300"></span>
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors relative group">
              Terms of Service
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-primary group-hover:w-full transition-all duration-300"></span>
            </a>
          </div>
        </div>
      </div>

      {/* Back to Top Button - Enhanced Animation */}
      <Button
        onClick={scrollToTop}
        variant="hero"
        size="icon"
        className="fixed bottom-8 right-8 rounded-full shadow-lg z-40 hover:scale-110 transition-transform duration-300"
        aria-label="Back to top"
      >
        <ArrowUp className="w-5 h-5" />
      </Button>

      {/* Animated Marquee - Modern Glassmorphism Design with Dark/Light Mode Support */}
      <div className="relative overflow-hidden shadow-xl border-y border-white/10 dark:border-white/5">
        {/* Glassmorphism Background with Dark/Light Mode Support */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/40 via-secondary/40 to-accent/40 dark:from-primary/20 dark:via-secondary/20 dark:to-accent/20" />
        <div className="absolute inset-0 backdrop-blur-md bg-white/30 dark:bg-black/30" />

        {/* Decorative Elements */}
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-primary/20 dark:bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/3 w-24 h-24 bg-accent/20 dark:bg-accent/10 rounded-full blur-3xl"></div>

        {/* Responsive Container */}
        <div className="relative py-4 md:py-5 overflow-hidden">
          {/* Marquee Animation */}
          <div className="flex whitespace-nowrap animate-[marquee_15s_linear_infinite] marquee-container">
            {/* Repeated Text for Continuous Flow */}
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex items-center mx-8 md:mx-12">
                <span className="text-foreground dark:text-white text-base md:text-lg font-semibold px-4 tracking-wide 
                  animate-pulse-subtle group inline-flex items-center gap-3
                  hover:scale-105 transition-all duration-500 ease-in-out">
                  <span className="marquee-text">Dharmapala Vidyalaya is cultivating future innovators and engineers</span>
                  <span className="marquee-text">Join us on this exciting journey</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add CSS for marquee text animation */}
      <style>{`
        @keyframes pulse-subtle {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 1; }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 3s ease-in-out infinite;
        }
        .hover:pause-animation:hover {
          animation-play-state: paused;
        }
        .marquee-text {
          background-image: linear-gradient(90deg, currentColor, currentColor 70%, rgba(255,255,255,0.8) 75%, currentColor 80%);
          background-size: 200% 100%;
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          animation: shine 8s linear infinite;
        }
        @keyframes shine {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
        @media (max-width: 640px) {
          .marquee-text {
            animation: shine 5s linear infinite;
          }
        }
      `}</style>
    </footer>
  );
};

export default Footer;
