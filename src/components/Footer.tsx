import { ArrowUp, ArrowRight, Facebook, Instagram, Twitter, Youtube, Mail, MapPin, Phone, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import clubLogo from "@/assets/club-logo.png";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const Footer = () => {
  const footerRef = useRef<HTMLElement>(null);
  const isInView = useInView(footerRef, { once: true, amount: 0.1 });

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const quickLinks = [
    { label: "About Us", href: "/about" },
    { label: "Projects", href: "/projects" },
    { label: "Events", href: "/events" },
    { label: "Gallery", href: "/gallery" },
    { label: "Blog", href: "/blog" },
  ];

  const resources = [
    { label: "STEM Learning Hub", href: "/learning-hub" },
    { label: "Join the Club", href: "/#join" },
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms of Service", href: "/terms-of-service" },
  ];

  const socialLinks = [
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Youtube, href: "#", label: "Youtube" },
  ];

  return (
    <footer ref={footerRef} className="relative pt-20 pb-10 px-4 overflow-hidden">
      {/* Liquid Glass Container */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/0 to-transparent pointer-events-none" />

      <motion.div
        className="relative mx-auto max-w-7xl bg-card/30 backdrop-blur-3xl border border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-foreground/5"
        initial={{ opacity: 0, y: 50 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Decorative Gradients */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px] pointer-events-none -z-10" />

        <div className="p-8 md:p-12 lg:p-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">

            {/* Brand Column */}
            <div className="sm:col-span-2 lg:col-span-5 space-y-8">
              <Link to="/" className="flex items-center gap-4 group w-fit">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 backdrop-blur-md p-2 border border-border/50 group-hover:border-primary/50 transition-all shadow-inner">
                    <img src={clubLogo} alt="YICDVP" className="w-full h-full object-contain" />
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-center text-muted-foreground/50 hover:bg-muted/50 hover:border-border transition-all cursor-pointer">
                    <span className="text-[10px] uppercase font-bold">Logo</span>
                  </div>
                </div>
                <div>
                  <h2 className="font-display font-black text-4xl lowercase tracking-tighter leading-none">yicdvp</h2>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mt-1 opacity-70">young innovators club</p>
                </div>
              </Link>

              <p className="text-muted-foreground leading-relaxed max-w-sm text-lg font-light">
                Constructing the future through innovation, creativity, and technological excellence at Dharmapala Vidyalaya.
              </p>

              {/* Social Links */}
              <div className="flex gap-3">
                {socialLinks.map((social, i) => (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="w-12 h-12 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-primary-foreground hover:bg-primary hover:border-primary transition-all group"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <social.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                  </motion.a>
                ))}
              </div>
            </div>

            {/* Links Columns */}
            <div className="lg:col-span-3 space-y-8">
              <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-muted-foreground">quick links</h3>
              <ul className="space-y-4">
                {quickLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-lg font-medium text-foreground/80 hover:text-primary transition-colors flex items-center gap-2 group w-fit"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/0 group-hover:bg-primary transition-colors" />
                      <span className="group-hover:translate-x-1 transition-transform">{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-4 space-y-8">
              <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-muted-foreground">newsletter</h3>

              <div className="p-6 rounded-3xl bg-muted/30 border border-border/50 backdrop-blur-md">
                <h4 className="font-bold text-xl mb-2 lowercase tracking-tight">stay in the loop</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Get the latest updates on workshops and hackathons.
                </p>
                <form className="flex gap-2">
                  <Input
                    placeholder="email address"
                    className="bg-muted/50 border-border/50 h-12 rounded-xl focus:border-primary/50 text-sm placeholder:text-muted-foreground/50"
                  />
                  <Button size="icon" className="h-12 w-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </form>
              </div>


            </div>

          </div>

          <div className="mt-16 pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/50">
              © 2026 young innovators club. all rights reserved.
            </p>
            <div className="flex gap-6">
              <Link to="/privacy-policy" className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/50 hover:text-primary transition-colors">privacy</Link>
              <Link to="/terms-of-service" className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/50 hover:text-primary transition-colors">terms</Link>
            </div>
          </div>
        </div>
      </motion.div>
    </footer>
  );
};

export default Footer;
