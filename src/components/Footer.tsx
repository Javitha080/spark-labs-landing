import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUp, Facebook, Instagram, Mail, MapPin, Phone, Send, Twitter, Youtube, ArrowRight } from "lucide-react";
import clubLogo from "@/assets/club-logo.png";
import { Link } from "react-router-dom";

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-muted/30 text-foreground border-t border-border relative">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* Brand Column */}
          <div className="lg:col-span-5 space-y-6">
            <Link to="/" className="flex items-center gap-4 group w-fit">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center p-2">
                <img src={clubLogo} alt="YICDVP" className="w-full h-full object-contain" />
              </div>
              <div>
                <h2 className="font-display font-black text-2xl uppercase leading-none">YICDVP</h2>
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Young Innovators Club</p>
              </div>
            </Link>
            <p className="font-body text-lg max-w-md text-muted-foreground">
              Cultivating the next generation of disrupters, creators, and tech leaders at Dharmapala Vidyalaya.
            </p>
            <div className="flex gap-4">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                <a key={i} href="#" className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links Column */}
          <div className="lg:col-span-3 space-y-6">
            <h3 className="font-display font-bold text-lg uppercase text-foreground">Quick Links</h3>
            <ul className="space-y-3 font-medium text-muted-foreground">
              {[
                { label: "About Us", href: "#about" },
                { label: "Projects", href: "#projects" },
                { label: "Events", href: "#events" },
                { label: "Join the Club", href: "#join" },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="flex items-center gap-2 hover:text-primary transition-colors group">
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="tracking-tight">{link.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter Column */}
          <div className="lg:col-span-4 space-y-6">
            <h3 className="font-display font-bold text-lg uppercase text-foreground">Stay Updated</h3>
            <p className="font-sans text-sm text-muted-foreground">Get the latest on workshops and hackathons.</p>
            <form className="flex flex-col gap-3">
              <Input
                placeholder="ENTER YOUR EMAIL"
                className="bg-background rounded-xl border-border h-12 font-sans focus-visible:ring-primary"
              />
              <Button className="rounded-xl h-12 font-bold uppercase shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
                Subscribe
              </Button>
            </form>
          </div>

        </div>

        <div className="mt-16 pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4 font-mono text-xs uppercase text-muted-foreground">
          <p>© 2026 Young Innovators Club. All rights reserved.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
          </div>
        </div>
      </div>

      {/* Back to Top */}
      <button
        onClick={scrollToTop}
        className="absolute bottom-8 right-8 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 hover:scale-105 transition-all shadow-lg"
      >
        <ArrowUp className="w-6 h-6" />
      </button>

    </footer>
  );
};

export default Footer;
