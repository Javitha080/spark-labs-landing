import { ArrowUp, ArrowRight, Facebook, Instagram, Twitter, Youtube, Mail, MapPin, Phone, ExternalLink, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OptimizedImage from "@/components/ui/OptimizedImage";
import { clubLogo, schoolLogo } from "@/components/ClubLogo";
import { Link } from "react-router-dom";
import { m, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import LiquidGlassProvider from "@/components/effects/LiquidGlassProvider";

gsap.registerPlugin(ScrollTrigger);

const Footer = () => {
  const footerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(footerRef, { once: true, amount: 0.1 });
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);

  // GSAP ScrollTrigger — pin + scrub footer content reveal
  useGSAP(() => {
    if (!footerRef.current || !contentRef.current) return;

    // Check reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const brandCol = contentRef.current.querySelector(".footer-brand");
    const linksCols = contentRef.current.querySelectorAll(".footer-links-col");
    const newsletter = contentRef.current.querySelector(".footer-newsletter");
    const socialIcons = contentRef.current.querySelectorAll(".footer-social-icon");
    const bottomBar = contentRef.current.querySelector(".footer-bottom-bar");

    // Set initial states
    if (brandCol) gsap.set(brandCol, { opacity: 0, x: -40 });
    if (linksCols.length) gsap.set(linksCols, { opacity: 0, y: 40 });
    if (newsletter) gsap.set(newsletter, { opacity: 0, scale: 0.9 });
    if (socialIcons.length) gsap.set(socialIcons, { opacity: 0, scale: 0.5 });
    if (bottomBar) gsap.set(bottomBar, { opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: footerRef.current,
        start: "top 85%",
        end: "top 30%",
        scrub: 1,
        once: true,
      }
    });

    // 1. Brand column slides in from left
    if (brandCol) {
      tl.to(brandCol, { opacity: 1, x: 0, duration: 0.3, ease: "power3.out" });
    }

    // 2. Links columns stagger in from bottom
    if (linksCols.length) {
      tl.to(linksCols, { opacity: 1, y: 0, duration: 0.3, stagger: 0.1, ease: "power3.out" }, "-=0.1");
    }

    // 3. Newsletter card scales up from center
    if (newsletter) {
      tl.to(newsletter, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(1.5)" }, "-=0.15");
    }

    // 4. Social icons pop in with spring
    if (socialIcons.length) {
      tl.to(socialIcons, { opacity: 1, scale: 1, duration: 0.25, stagger: 0.05, ease: "back.out(2)" }, "-=0.1");
    }

    // 5. Bottom bar fades in last
    if (bottomBar) {
      tl.to(bottomBar, { opacity: 1, duration: 0.2, ease: "power2.out" }, "-=0.05");
    }
  }, { scope: footerRef });

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setNewsletterSubmitting(true);
    try {
      const response = await fetch("/api/send-contact-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Newsletter Subscriber",
          email: newsletterEmail,
          message: "Newsletter subscription request",
        }),
      });
      if (response.ok) {
        setNewsletterEmail("");
      }
    } catch {
      // Silently fail — newsletter is non-critical
    } finally {
      setNewsletterSubmitting(false);
    }
  };

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
    { icon: Facebook, href: "https://www.facebook.com/dharmapalaLKofficia/", label: "Facebook" },
    { icon: Instagram, href: "https://www.instagram.com/yicdvp_official/", label: "Instagram" },
    { icon: X, href: "#", label: "Twitter" },
    { icon: Youtube, href: "https://www.youtube.com/channel/UCqCTubkeHjeldLAC4Jh1j8Q", label: "Youtube" },
  ];

  return (
    <footer ref={footerRef} className="relative pt-20 pb-10 px-4 overflow-hidden">
      {/* Liquid Glass Container */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/0 to-transparent pointer-events-none" />

      <LiquidGlassProvider
        config={{ blurAmount: 0.25, refraction: 0.7, chromAberration: 0.05 }}
        className="relative mx-auto max-w-7xl w-full"
      >
        {/* Liquid Blur Background Sibling (Captured by WebGL Shader) */}
        <div className="absolute inset-0 bg-background/30 rounded-[2.5rem]" />
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 opacity-50 blur-3xl pointer-events-none" />
          <div className="absolute top-0 left-1/4 size-[500px] bg-primary/20 rounded-full blur-[100px] opacity-60 pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 size-[400px] bg-secondary/20 rounded-full blur-[100px] opacity-50 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] bg-accent/10 rounded-full blur-[120px] opacity-40 pointer-events-none" />
        </div>

        <m.div
          ref={contentRef}
          data-liquid-glass
          className="relative bg-background/40 backdrop-blur-md border border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-foreground/5 transition-all w-full"
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="p-8 md:p-12 lg:p-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">

              {/* Brand Column */}
              <div className="footer-brand sm:col-span-2 lg:col-span-5 space-y-8">
                <Link to="/" className="flex items-center gap-4 group w-fit">
                  <div className="flex gap-4">
                    <div className="size-16 rounded-2xl bg-muted/50 backdrop-blur-md p-2 border border-border/50 group-hover:border-primary/50 transition-all shadow-inner">
                      <OptimizedImage src={clubLogo} alt="YICDVP" className="size-full object-contain" />
                    </div>
                    <div className="size-16 rounded-2xl bg-muted/50 backdrop-blur-md p-2 border border-border/50 group-hover:border-primary/50 transition-all shadow-inner">
                      <OptimizedImage src={schoolLogo} alt="YICDVP" className="size-full object-contain" />
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
                    <m.a
                      key={social.label}
                      href={social.href}
                      aria-label={social.label}
                      className="footer-social-icon size-12 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-primary-foreground hover:bg-primary hover:border-primary transition-all group"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <social.icon className="size-5 transition-transform group-hover:scale-110" />
                    </m.a>
                  ))}
                </div>
              </div>

              {/* Links Columns */}
              <div className="footer-links-col lg:col-span-3 space-y-8">
                <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-muted-foreground">quick links</h3>
                <ul className="space-y-4">
                  {quickLinks.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.href}
                        className="text-lg font-medium text-foreground/80 hover:text-primary transition-colors flex items-center gap-2 group w-fit"
                      >
                        <span className="size-1.5 rounded-full bg-primary/0 group-hover:bg-primary transition-colors" />
                        <span className="group-hover:translate-x-1 transition-transform">{link.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="footer-links-col lg:col-span-4 space-y-8">
                <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-muted-foreground">newsletter</h3>

                <div className="footer-newsletter p-6 rounded-3xl bg-muted/30 border border-border/50 backdrop-blur-md">
                  <h4 className="font-bold text-xl mb-2 lowercase tracking-tight">stay in the loop</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get the latest updates on workshops and hackathons.
                  </p>
                  <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                    <Input
                      placeholder="email address"
                      type="email"
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      className="bg-muted/50 border-border/50 h-12 rounded-xl focus:border-primary/50 text-sm placeholder:text-muted-foreground/50"
                    />
                    <Button type="submit" size="icon" aria-label="Subscribe to newsletter" disabled={newsletterSubmitting} className="size-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                      {newsletterSubmitting ? (
                        <span className="animate-spin">⟳</span>
                      ) : (
                        <ArrowRight className="size-5" />
                      )}
                    </Button>
                  </form>
                </div>


              </div>

            </div>

            <div className="footer-bottom-bar mt-16 pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/50">
                © 2026 young innovators club. all rights reserved.
              </p>
              <div className="flex gap-6">
                <Link to="/privacy-policy" className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/50 hover:text-primary transition-colors">privacy</Link>
                <Link to="/terms-of-service" className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/50 hover:text-primary transition-colors">terms</Link>
              </div>
            </div>
          </div>
        </m.div>
      </LiquidGlassProvider>
    </footer>
  );
};

export default Footer;
