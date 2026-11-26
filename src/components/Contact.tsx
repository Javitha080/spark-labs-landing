// react-doctor-disable no-giant-component
import { Mail, MapPin, Phone, Send, User, MessageSquare, Loader2 } from "lucide-react";
import SpecularButton from "@/components/reactbits/SpecularButton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { TextReveal, GradientTextReveal } from "@/components/animation/TextReveal";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { useLandingBlocks } from "@/hooks/useLandingBlocks";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { m, AnimatePresence } from "framer-motion";
import { invokeFunction } from "@/lib/invokeFunction";
import { toastError, logError } from "@/lib/errors";
import { sanitizeTextInput, sanitizeEmail } from "@/lib/sanitize";
import { Turnstile } from "@/components/Turnstile";

// Lazy-load Map component (MapLibre GL is ~276KB gzipped)
const Map = lazy(() => import("./Map"));

interface ContactInfo {
  icon: React.ElementType;
  title: string;
  details: string[];
  gradient: string;
}

const ContactInfoCard = ({ info, index }: { info: ContactInfo; index: number }) => {
  const { ref, isVisible } = useScrollAnimation({
    threshold: 0.3,
    triggerOnce: true,
  });

  return (
    <div
      ref={ref}
      className={
        `glass-card p-6 md:p-8 rounded-2xl text-center group
        transition-all duration-500 hover:scale-105 hover:shadow-xl
        ${isVisible ? 'animate-fade-up' : 'opacity-0'}`
      }
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className={`size-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${info.gradient} flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
        <info.icon className="size-8 text-white" aria-hidden="true" />
      </div>
      <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">{info.title}</h3>
      {info.details.map((detail: string, i: number) => (
        <p key={detail} className={`${i === 0 ? 'text-foreground font-medium' : 'text-muted-foreground text-sm'} break-all`}>
          {detail}
        </p>
      ))}
    </div>
  );
};

const CONTACT_DEFAULTS = {
  heading_main: "get in touch",
  heading_sub: "have questions? we'd love to hear from you. send us a message!",
  card_1_title: "Visit Us",
  card_1_detail_1: "Dharmapala Vidyalaya",
  card_1_detail_2: "Silva Place, Pannipitiya 10230",
  card_2_title: "Email Us",
  card_2_detail_1: "innovators@dharmapala.edu.lk",
  card_2_detail_2: "General Inquiries",
  card_3_title: "Call Us",
  card_3_detail_1: "011 289 6652",
  card_3_detail_2: "Mon - Fri, 9AM - 4PM",
};

const Contact = ({ omitSectionId = false }: { omitSectionId?: boolean }) => {
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isCompactTurnstile = useMediaQuery("(max-width: 479px)");
  const [layoutGen, setLayoutGen] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia("(max-width: 479px)");
    const onChange = () => {
      setLayoutGen((g) => g + 1);
    };
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileState, setTurnstileState] = useState<{
    token: string | null;
    error: boolean;
    compact: boolean;
    gen: number;
  }>({ token: null, error: false, compact: isCompactTurnstile, gen: 0 });
  const isTurnstileFresh =
    turnstileState.compact === isCompactTurnstile && turnstileState.gen === layoutGen;
  const turnstileToken = isTurnstileFresh ? turnstileState.token : null;
  const turnstileError = isTurnstileFresh ? turnstileState.error : false;
  // Turnstile tokens are single-use: bump this to remount the widget and get a fresh one
  const [turnstileKey, setTurnstileKey] = useState(0);
  const resetTurnstile = () => {
    setTurnstileState({
      token: null,
      error: false,
      compact: isCompactTurnstile,
      gen: layoutGen,
    });
    setTurnstileKey((k) => k + 1);
  };
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { ref: headerRef } = useScrollAnimation();

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case "name":
        return value.trim().length < 2 ? "Name must be at least 2 characters" : "";
      case "email":
        return sanitizeEmail(value) ? "" : "Please enter a valid email address";
      case "message": {
        const trimmed = value.trim();
        if (trimmed.length < 10) return "Message must be at least 10 characters";
        if (trimmed.length > 2000) return "Message must be 2000 characters or fewer";
        return "";
      }
      default:
        return "";
    }
  };

  const handleFieldChange = (field: "name" | "email" | "message", value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleFieldBlur = (field: "name" | "email" | "message") => {
    setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, formData[field]) }));
  };

  const { blocks: contactBlocks } = useLandingBlocks("contact");
  const content = useMemo(() => {
    const merged = { ...CONTACT_DEFAULTS } as Record<string, string>;
    for (const key of Object.keys(merged)) {
      if (key in contactBlocks) merged[key] = contactBlocks[key];
    }
    return merged as typeof CONTACT_DEFAULTS;
  }, [contactBlocks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {
      name: validateField("name", formData.name),
      email: validateField("email", formData.email),
      message: validateField("message", formData.message),
    };
    if (Object.values(errors).some(Boolean)) {
      setFieldErrors(errors);
      toast({
        title: "Check Your Details",
        description: "Please fix the highlighted fields and try again.",
        variant: "destructive",
      });
      return;
    }

    // Require Turnstile verification for submission
    if (!turnstileToken) {
      toast({
        title: "Security Check Required",
        description: "Please complete the security verification before sending.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const sanitizedData = {
        name: sanitizeTextInput(formData.name, 100),
        email: sanitizeEmail(formData.email),
        message: sanitizeTextInput(formData.message, 2000),
      };

      if (!sanitizedData.email) {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
        return;
      }

      // Try Worker API endpoint first (with Turnstile protection)
      let workerUnavailable = false;
      try {
        const response = await fetch("/api/send-contact-message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Turnstile-Token": turnstileToken,
          },
          body: JSON.stringify(sanitizedData),
        });

        if (response.ok) {
          toast({
            title: "Message Sent!",
            description: "We'll get back to you as soon as possible.",
          });
          setFormData({ name: "", email: "", message: "" });
          setFieldErrors({});
          resetTurnstile();
          return;
        }

        // 4xx = the request itself was rejected (validation, failed Turnstile,
        // rate limit). Falling back to the Edge Function would just re-send the
        // same rejected message and sidestep those protections, so surface the
        // server's reason instead. Only 5xx / network errors fall through.
        if (response.status < 500) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          toast({
            title: response.status === 429 ? "Too Many Messages" : "Message Not Sent",
            description:
              response.status === 429
                ? "You've sent several messages recently. Please try again in a few minutes."
                : payload.error || "Please check your details and try again.",
            variant: "destructive",
          });
          resetTurnstile(); // the token was consumed by this attempt
          return;
        }

        workerUnavailable = true;
        logError(new Error(`Worker endpoint returned ${response.status}, falling back to Edge Function`), "Contact.workerFallback");
      } catch (workerErr) {
        workerUnavailable = true;
        logError(workerErr, "Contact.workerUnavailable");
      }

      if (!workerUnavailable) return;

      // Fallback: Supabase Edge Function (only when the Worker is down).
      // Pass the token through so the function can run its own server-side
      // Turnstile verification (enforced when TURNSTILE_SECRET_KEY is set).
      const { error } = await invokeFunction('send-contact-message', {
        body: sanitizedData,
        headers: { "X-Turnstile-Token": turnstileToken },
      });

      if (error) {
        toast({
          title: "Message Failed",
          description: error.message,
          variant: "destructive",
        });
        resetTurnstile();
        return;
      }

      toast({
        title: "Message Sent!",
        description: "We'll get back to you as soon as possible.",
      });
      setFormData({ name: "", email: "", message: "" });
      setFieldErrors({});
      resetTurnstile();
    } catch (error) {
      logError(error, "Contact.submit");
      toastError(error, "Please try again later.", "Contact.submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactInfo = [
    {
      icon: MapPin,
      title: content?.card_1_title ?? "Visit Us",
      details: [content?.card_1_detail_1 ?? "", content?.card_1_detail_2 ?? ""],
      gradient: "from-primary to-primary-glow"
    },
    {
      icon: Mail,
      title: content?.card_2_title ?? "Email Us",
      details: [content?.card_2_detail_1 ?? "", content?.card_2_detail_2 ?? ""],
      gradient: "from-secondary to-secondary-glow"
    },
    {
      icon: Phone,
      title: content?.card_3_title ?? "Call Us",
      details: [content?.card_3_detail_1 ?? "", content?.card_3_detail_2 ?? ""],
      gradient: "from-accent to-accent-glow"
    }
  ];



  const clubLocation = {
    lat: 6.845798,
    lng: 79.946565,
    title: "Dharmapala Vidyalaya",
    description: "Silva Place, Pannipitiya 10230, Sri Lanka"
  };

  return (
    <section id={omitSectionId ? undefined : "contact"} className="section-padding relative overflow-hidden">
      {/* Background decoration */}
      <div className="events-ambient-orb absolute top-0 left-0 size-96 bg-primary/5 rounded-full blur-3xl -z-10" />
      <div className="events-ambient-orb absolute bottom-0 right-0 size-80 bg-secondary/5 rounded-full blur-3xl -z-10" />

      <div className="container-custom">
        <div ref={headerRef} className="text-center mb-16 px-4">
          <TextReveal animation="fade-up">
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black capitalize mb-4 tracking-tighter break-words">
              {content.heading_main.includes(' ') ? (
                <>
                  {content.heading_main.substring(0, content.heading_main.lastIndexOf(' '))} <GradientTextReveal gradient="from-primary to-accent">{content.heading_main.substring(content.heading_main.lastIndexOf(' ') + 1)}</GradientTextReveal>
                </>
              ) : (
                <GradientTextReveal gradient="from-primary to-accent">{content.heading_main}</GradientTextReveal>
              )}
            </h2>
          </TextReveal>
          <TextReveal animation="fade-up" delay={100}>
            <p className="text-lg sm:text-xl md:text-2xl font-medium tracking-tight leading-snug text-muted-foreground/90 max-w-2xl mx-auto">
              {content?.heading_sub ?? "have questions? we'd love to hear from you."}
            </p>
          </TextReveal>
        </div>

        {/* Contact Info Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {contactInfo.map((info, index) => (
            <ContactInfoCard key={info.title} info={info} index={index} />
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Map */}
          <TextReveal animation="slide-right" className="w-full lg:h-full">
            <Suspense fallback={<div className="w-full h-[450px] lg:h-full lg:min-h-[600px] bg-muted/30 animate-pulse rounded-[2.5rem]" />}>
              {/* react-doctor-disable jsx-no-new-array-as-prop */}
              <Map locations={[clubLocation]} className="w-full h-[450px] lg:h-full lg:min-h-[600px]" />
            </Suspense>
          </TextReveal>

          {/* Contact Form */}
          <TextReveal animation="slide-left" className="w-full">
            <m.div
              initial={reducedMotion ? false : { opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={reducedMotion ? { duration: 0 } : undefined}
              className="glass-card p-1 md:p-2 rounded-[2.5rem] relative overflow-hidden group"
            >
              <div className="events-blur-card relative z-10 bg-card/50 backdrop-blur-2xl p-8 md:p-10 rounded-[2.2rem] border border-border/50">
                {/* Decorative glow */}
                <div className="events-ambient-orb absolute -top-20 -right-20 size-40 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors duration-500" />

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Send className="size-5" aria-hidden="true" />
                    </div>
                    <h3 className="text-3xl md:text-4xl font-black lowercase gradient-text tracking-tight">send us a message</h3>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                    <m.div
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        visible: { opacity: 1, x: 0 }
                      }}
                      initial={reducedMotion ? false : "hidden"}
                      whileInView="visible"
                      viewport={{ once: true }}
                      transition={reducedMotion ? { duration: 0 } : { delay: 0.1 }}
                      className="group/input"
                    >
                      <label htmlFor="contact-name" className="block text-sm font-bold text-muted-foreground mb-2 ml-1 uppercase tracking-widest">Name</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/input:text-primary transition-colors">
                          <User className="size-5" aria-hidden="true" />
                        </div>
                        <Input
                          id="contact-name"
                          name="name"
                          type="text"
                          autoComplete="name"
                          placeholder="What should we call you?"
                          value={formData.name}
                          onChange={(e) => handleFieldChange("name", e.target.value)}
                          onBlur={() => handleFieldBlur("name")}
                          required
                          maxLength={100}
                          minLength={2}
                          aria-invalid={Boolean(fieldErrors.name)}
                          className={`h-14 pl-12 rounded-2xl bg-muted/50 border-border/50 focus:border-primary/50 focus:bg-muted/80 transition-all text-base ring-offset-transparent focus-visible:ring-primary/20 ${fieldErrors.name ? "border-destructive" : ""}`}
                        />
                      </div>
                      {fieldErrors.name && <p className="text-destructive text-xs mt-1 ml-1">{fieldErrors.name}</p>}
                    </m.div>

                    <m.div
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        visible: { opacity: 1, x: 0 }
                      }}
                      initial={reducedMotion ? false : "hidden"}
                      whileInView="visible"
                      viewport={{ once: true }}
                      transition={reducedMotion ? { duration: 0 } : { delay: 0.2 }}
                      className="group/input"
                    >
                      <label htmlFor="contact-email" className="block text-sm font-bold text-muted-foreground mb-2 ml-1 uppercase tracking-widest">Email Address</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/input:text-primary transition-colors">
                          <Mail className="size-5" aria-hidden="true" />
                        </div>
                        <Input
                          id="contact-email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          placeholder="where can we reach you?"
                          value={formData.email}
                          onChange={(e) => handleFieldChange("email", e.target.value)}
                          onBlur={() => handleFieldBlur("email")}
                          required
                          aria-invalid={Boolean(fieldErrors.email)}
                          className={`h-14 pl-12 rounded-2xl bg-muted/50 border-border/50 focus:border-primary/50 focus:bg-muted/80 transition-all text-base ring-offset-transparent focus-visible:ring-primary/20 ${fieldErrors.email ? "border-destructive" : ""}`}
                        />
                      </div>
                      {fieldErrors.email && <p className="text-destructive text-xs mt-1 ml-1">{fieldErrors.email}</p>}
                    </m.div>

                    <m.div
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        visible: { opacity: 1, x: 0 }
                      }}
                      initial={reducedMotion ? false : "hidden"}
                      whileInView="visible"
                      viewport={{ once: true }}
                      transition={reducedMotion ? { duration: 0 } : { delay: 0.3 }}
                      className="group/input"
                    >
                      <label htmlFor="contact-message" className="block text-sm font-bold text-muted-foreground mb-2 ml-1 uppercase tracking-widest">Your Message</label>
                      <div className="relative">
                        <div className="absolute left-4 top-6 text-muted-foreground group-focus-within/input:text-primary transition-colors">
                          <MessageSquare className="size-5" aria-hidden="true" />
                        </div>
                        <Textarea
                          id="contact-message"
                          name="message"
                          placeholder="Write your thoughts here..."
                          value={formData.message}
                          onChange={(e) => handleFieldChange("message", e.target.value)}
                          onBlur={() => handleFieldBlur("message")}
                          required
                          minLength={10}
                          maxLength={2000}
                          rows={5}
                          aria-invalid={Boolean(fieldErrors.message)}
                          className={`pl-12 pt-5 rounded-[1.5rem] bg-muted/50 border-border/50 focus:border-primary/50 focus:bg-muted/80 transition-all text-base resize-none ring-offset-transparent focus-visible:ring-primary/20 ${fieldErrors.message ? "border-destructive" : ""}`}
                        />
                      </div>
                      {fieldErrors.message && <p className="text-destructive text-xs mt-1 ml-1">{fieldErrors.message}</p>}
                    </m.div>

                    <m.div
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        visible: { opacity: 1, y: 0 }
                      }}
                      initial={reducedMotion ? false : "hidden"}
                      whileInView="visible"
                      viewport={{ once: true }}
                      transition={reducedMotion ? { duration: 0 } : { delay: 0.35 }}
                    >
                      <Turnstile
                        key={`${turnstileKey}-${isCompactTurnstile ? "compact" : "normal"}`}
                        siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                        size={isCompactTurnstile ? "compact" : "normal"}
                        onSuccess={(token) => {
                          setTurnstileState({
                            token: token || null,
                            error: false,
                            compact: isCompactTurnstile,
                            gen: layoutGen,
                          });
                        }}
                        onError={() => {
                          setTurnstileState({
                            token: null,
                            error: true,
                            compact: isCompactTurnstile,
                            gen: layoutGen,
                          });
                        }}
                        theme={resolvedTheme === "light" ? "light" : "dark"}
                        className="mb-4"
                      />
                      {turnstileError && (
                        <p className="text-xs text-destructive mt-1">
                          Security check could not load. Please use &ldquo;Retry security check&rdquo; above.
                        </p>
                      )}
                    </m.div>

                    <m.div
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        visible: { opacity: 1, y: 0 }
                      }}
                      initial={reducedMotion ? false : "hidden"}
                      whileInView="visible"
                      viewport={{ once: true }}
                      transition={reducedMotion ? { duration: 0 } : { delay: 0.4 }}
                    >
                      {/* ReactBits SpecularButton: real <button type="submit">;
                          pointer-tracked specular sheen replaces the gradient
                          fill so the contact form speaks the same button
                          language as enrollment. Disabled semantics unchanged. */}
                      <SpecularButton
                        type="submit"
                        size="lg"
                        disabled={isSubmitting || !turnstileToken}
                        className="group w-full h-16 rounded-[1.5rem] text-lg font-bold"
                        radius={24}
                        tint="#f97316"
                        tintOpacity={0.24}
                        baseColor="#0a0a0a"
                        textColor="#fafafa"
                        lineColor="#f97316"
                      >
                        <AnimatePresence mode="wait">
                          {isSubmitting ? (
                            <m.div
                              key="loading"
                              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="flex items-center gap-2"
                            >
                              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                              Sending&hellip;
                            </m.div>
                          ) : (
                            <m.div
                              key="normal"
                              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="flex items-center gap-2"
                            >
                              <span>Send Message</span>
                              <Send className="size-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" aria-hidden="true" />
                            </m.div>
                          )}
                        </AnimatePresence>
                      </SpecularButton>
                    </m.div>

                    <p className="text-center text-xs text-muted-foreground mt-4">
                      By sending, you agree to our <Link to="/privacy-policy" className="underline hover:text-primary transition-colors">Privacy Policy</Link>
                    </p>
                  </form>
                </div>
              </div>
            </m.div>
          </TextReveal>
        </div>
      </div>
    </section>
  );
};

export default Contact;
