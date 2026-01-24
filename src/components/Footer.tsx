import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ArrowUp, Facebook, Instagram, Mail, MapPin, Phone, Send, Twitter, Youtube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import clubLogo from "@/assets/club-logo.png";

interface FooterProps {
  hideNewsletter?: boolean;
}

const Footer = ({ hideNewsletter = false }: FooterProps) => {
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
      {!hideNewsletter && (
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
                  <label htmlFor="newsletter-email" className="sr-only">Email address</label>
                  <Input
                    id="newsletter-email"
                    name="email"
                    type="email"
                    autoComplete="email"
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
      )}

      {/* Main Footer - Enhanced Layout */}
      <div className="container-custom py-16 glass-card rounded-t-3xl mt-8 border-t border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-full blur-3xl -z-10"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* About - Enhanced Branding */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-lg ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                  <img
                    src={clubLogo}
                    alt="Young Innovators Club Logo"
                    className="w-full h-full object-cover"
                    loading="lazy"
                    width="40"
                    height="40"
                  />
                </div>
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
            © 2026 Young Innovation Club, Dharmapala Vidyalaya Pannipitiya. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm">
            <a href="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors relative group">
              Privacy Policy
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-primary group-hover:w-full transition-all duration-300"></span>
            </a>
            <a href="/terms-of-service" className="text-muted-foreground hover:text-primary transition-colors relative group">
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

      {/* Modern Glassmorphic Marquee */}
      <div className="relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/10 to-accent/5 dark:from-primary/10 dark:via-secondary/15 dark:to-accent/10" />

        {/* Floating orbs for depth */}
        <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-40 h-40 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -right-20 top-1/2 -translate-y-1/2 w-40 h-40 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-60 h-20 bg-accent/10 rounded-full blur-3xl" />

        {/* Glass container with modern border */}
        <div className="relative z-10 border-y border-white/10 dark:border-white/5 backdrop-blur-2xl bg-white/40 dark:bg-white/5">
          {/* Top highlight line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          {/* Bottom highlight line */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-secondary/50 to-transparent" />

          {/* Marquee content */}
          <div className="relative py-4 md:py-5 overflow-hidden">
            {/* Fade edges for smooth infinite scroll effect */}
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background via-background/80 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background via-background/80 to-transparent z-10 pointer-events-none" />

            {/* GPU-Accelerated Marquee */}
            <div className="marquee-smooth">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="flex items-center shrink-0 gap-8 px-4">
                  {/* Tag 1 - Primary */}
                  <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 border border-primary/20 backdrop-blur-sm shadow-lg shadow-primary/5 hover:scale-105 transition-transform cursor-default">
                    <span className="text-lg">✨</span>
                    <span className="text-sm md:text-base font-medium text-foreground/90 dark:text-white/90 whitespace-nowrap">
                      Cultivating future innovators
                    </span>
                  </div>

                  {/* Decorative separator */}
                  <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-primary to-secondary" />

                  {/* Tag 2 - Secondary */}
                  <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-gradient-to-r from-secondary/10 to-secondary/5 dark:from-secondary/20 dark:to-secondary/10 border border-secondary/20 backdrop-blur-sm shadow-lg shadow-secondary/5 hover:scale-105 transition-transform cursor-default">
                    <span className="text-lg">🚀</span>
                    <span className="text-sm md:text-base font-medium text-foreground/90 dark:text-white/90 whitespace-nowrap">
                      Join the innovation journey
                    </span>
                  </div>

                  {/* Decorative separator */}
                  <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-secondary to-accent" />

                  {/* Tag 3 - Accent */}
                  <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-gradient-to-r from-accent/10 to-accent/5 dark:from-accent/20 dark:to-accent/10 border border-accent/20 backdrop-blur-sm shadow-lg shadow-accent/5 hover:scale-105 transition-transform cursor-default">
                    <span className="text-lg">💡</span>
                    <span className="text-sm md:text-base font-medium text-foreground/90 dark:text-white/90 whitespace-nowrap">
                      Innovation • Creativity • Excellence
                    </span>
                  </div>

                  {/* Decorative separator */}
                  <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-accent to-primary" />

                  {/* Tag 4 - Mixed gradient */}
                  <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 dark:from-primary/15 dark:via-secondary/15 dark:to-accent/15 border border-white/20 backdrop-blur-sm shadow-lg hover:scale-105 transition-transform cursor-default">
                    <span className="text-lg">🎯</span>
                    <span className="text-sm md:text-base font-medium text-foreground/90 dark:text-white/90 whitespace-nowrap">
                      Dharmapala Vidyalaya
                    </span>
                  </div>

                  {/* Decorative separator */}
                  <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-primary to-secondary" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
