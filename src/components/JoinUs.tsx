// react-doctor-disable no-giant-component
import { useState, useEffect, useMemo, memo, type ReactNode } from "react";
import { CheckCircle, Award, Users, FileText, Briefcase, Trophy, LucideIcon, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { logError } from "@/lib/errors";
import { sanitizeTextInput, sanitizeEmail, sanitizePhone } from "@/lib/sanitize";
import { supportsWebGL2 } from "@/lib/webglSupport";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { TextReveal, GradientTextReveal } from "@/components/animation/TextReveal";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Turnstile } from "@/components/Turnstile";
import ScrollFloat from "@/components/reactbits/ScrollFloat";
import FaultyTerminal from "@/components/reactbits/FaultyTerminal";
import ElectricBorder from "@/components/reactbits/ElectricBorder";
import SpecularButton from "@/components/reactbits/SpecularButton";
import ShinyText from "@/components/reactbits/ShinyText";
// Moved outside JoinUs and memoized to prevent re-renders when form state changes
interface Benefit {
  icon: LucideIcon;
  title: string;
  gradient: string;
}

const BenefitCard = memo(({ benefit, index }: { benefit: Benefit; index: number }) => {
  const { ref, isVisible } = useScrollAnimation({
    threshold: 0.3,
    triggerOnce: true,
  });

  return (
    <div
      ref={ref}
      className={`
        glass-card p-5 md:p-6 rounded-2xl flex items-center gap-4
        transition-all duration-500 hover:scale-[1.02] hover:shadow-xl group
        ${isVisible ? 'animate-slide-in-left' : 'opacity-0'}
      `}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className={`size-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br ${benefit.gradient} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg`}>
        <benefit.icon className="size-7 md:w-8 md:h-8 text-white" aria-hidden="true" />
      </div>
      <h4 className="text-base sm:text-lg font-bold group-hover:text-primary transition-colors">{benefit.title}</h4>
    </div>
  );
});

BenefitCard.displayName = "BenefitCard";

// Benefits data defined outside component to prevent recreation
const benefits: Benefit[] = [
  {
    icon: CheckCircle,
    title: "Hands-on STEM Experience",
    gradient: "from-primary to-primary-glow"
  },
  {
    icon: Users,
    title: "Team Collaboration Skills",
    gradient: "from-secondary to-secondary-glow"
  },
  {
    icon: Award,
    title: "Certificate of Participation",
    gradient: "from-accent to-accent-glow"
  },
  {
    icon: FileText,
    title: "Portfolio Building",
    gradient: "from-primary to-primary-glow"
  },
  {
    icon: Briefcase,
    title: "Mentorship Opportunities",
    gradient: "from-secondary to-secondary-glow"
  },
  {
    icon: Trophy,
    title: "Competition Participation",
    gradient: "from-accent to-accent-glow"
  }
];

// Frame around the enrollment card. ReactBits ElectricBorder draws a live
// ember arc along the border; prefers-reduced-motion falls back to the plain
// glass card so nothing animates. Padding/background ride on className.
const EnrollmentCardFrame = ({
    reducedMotion,
    hasWebGL2,
    children,
}: {
    reducedMotion: boolean;
    hasWebGL2: boolean;
    children: ReactNode;
}) =>
    reducedMotion || !hasWebGL2 ? (
        <div className="glass-card relative rounded-3xl p-6 sm:p-8 lg:p-10">{children}</div>
    ) : (
        <ElectricBorder
            color="#f97316"
            glowColor="#ea580c"
            thickness={1.5}
            borderRadius={24}
            // 30fps keeps the ember arc ambient-cost; raw 60 here while the
            // terminal shader also runs is what made the section jank. No
            // backdrop-blur either — the live shader redraws underneath, so
            // glass on top would re-composite every frame (repo rule:
            // data-glass-stage="webgl"). Solid bg covers the glyphs.
            fps={30}
            className="rounded-3xl bg-background/85 p-6 sm:p-8 lg:p-10"
        >
            {children}
        </ElectricBorder>
    );

const JoinUs = ({ omitSectionId = false }: { omitSectionId?: boolean }) => {
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
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
    compact: boolean;
    gen: number;
  }>({ token: null, compact: isCompactTurnstile, gen: 0 });
  const isTurnstileFresh =
    turnstileState.compact === isCompactTurnstile && turnstileState.gen === layoutGen;
  const turnstileToken = isTurnstileFresh ? turnstileState.token : null;
  // Remount key for the Turnstile widget: the token is consumed server-side
  // on each verification, so a fresh challenge is needed after a success,
  // a failed submit, or a failed verification.
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [consent, setConsent] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    grade: "",
    email: "",
    phone: "",
    interest: "",
    reason: ""
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { ref: headerRef } = useScrollAnimation();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const hasWebGL2 = useMemo(() => supportsWebGL2(), []);

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case "name":
        return value.trim().length < 2 ? "Name must be at least 2 characters" : "";
      case "email":
        return sanitizeEmail(value) ? "" : "Please enter a valid email";
      case "phone": {
        const cleaned = sanitizePhone(value).trim();
        const digits = cleaned.replace(/\D/g, "");
        return cleaned.length >= 10 && digits.length >= 7
          ? ""
          : "Phone number must be at least 10 characters";
      }
      case "grade":
        return value.trim() ? "" : "Please select a grade";
      case "interest":
        return value.trim() ? "" : "Please select an area of interest";
      case "reason":
        return value.trim().length < 10 ? "Please tell us why you'd like to join (at least 10 characters)" : "";
      default:
        return "";
    }
  };

  const handleBlur = (field: string) => {
    const error = validateField(field, formData[field as keyof typeof formData]);
    setFieldErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!consent) {
      toast({
        title: "Consent Required",
        description: "Please agree to the privacy policy to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!turnstileToken) {
      toast({
        title: "Security Check Required",
        description: "Please complete the security verification before submitting.",
        variant: "destructive",
      });
      return;
    }

    // Validate everything up front, before any async work: the Radix Select
    // is not a real <select>, so its `required` never gates submit and
    // grade/interest could sail through empty on an Enter-key submit. The
    // phone is checked AFTER sanitization to match POST /api/enroll (min 10
    // chars and >= 7 digits).
    const email = sanitizeEmail(formData.email);
    const phone = sanitizePhone(formData.phone).trim();
    const validationErrors: Record<string, string> = {
      name: validateField("name", formData.name),
      email: email ? "" : "Please enter a valid email",
      phone:
        phone.length >= 10 && phone.replace(/\D/g, "").length >= 7
          ? ""
          : "Phone number must be at least 10 characters",
      grade: validateField("grade", formData.grade),
      interest: validateField("interest", formData.interest),
      reason: validateField("reason", formData.reason),
    };
    if (Object.values(validationErrors).some(Boolean)) {
      setFieldErrors(validationErrors);
      toast({
        title: "Check Your Details",
        description: "Please fill in the highlighted fields and try again.",
        variant: "destructive",
      });
      return;
    }

    // Built once from the same sanitized values the validation used.
    const sanitizedData = {
      name: sanitizeTextInput(formData.name, 100),
      email,
      phone,
      grade: formData.grade,
      interest: formData.interest,
      reason: sanitizeTextInput(formData.reason, 500),
    };

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Turnstile-Token": turnstileToken,
        },
        body: JSON.stringify({
          ...sanitizedData,
          consent_given: consent,
          privacy_policy_version: "v1.0_2025-01-22",
          turnstileToken,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        id?: string;
        error?: string;
      } | null;

      if (!response.ok) {
        setTurnstileState({
          token: null,
          compact: isCompactTurnstile,
          gen: layoutGen,
        });
        setTurnstileKey((k) => k + 1);

        const titleByStatus: Record<number, string> = {
          400: "Check Your Details",
          403: "Security Check Failed",
          409: "Already Registered",
          429: "Please Wait",
        };
        const fallbackByStatus: Record<number, string> = {
          400: "Please check your enrollment details and try again.",
          403: "We couldn't verify the security check. Please complete the verification again.",
          409: "An enrollment with this email already exists.",
          429: "Too many enrollment attempts recently. Please try again later.",
        };

        toast({
          title: titleByStatus[response.status] || "Submission Failed",
          description: payload?.error || fallbackByStatus[response.status] || "Please try again later.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Application Submitted!",
        description: "We'll review your application and send your Student Portal login credentials soon.",
      });

      setFormData({ name: "", grade: "", email: "", phone: "", interest: "", reason: "" });
      setFieldErrors({});
      setConsent(false);
      setTurnstileState({
        token: null,
        compact: isCompactTurnstile,
        gen: layoutGen,
      });
      // The consumed token is gone: remount a fresh widget for the next
      // applicant instead of leaving a "verified" widget with no token.
      setTurnstileKey((k) => k + 1);
    } catch (error) {
      logError(error, "JoinUs.submit");
      setTurnstileState({
        token: null,
        compact: isCompactTurnstile,
        gen: layoutGen,
      });
      setTurnstileKey((k) => k + 1);
      toast({
        title: "Submission Failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id={omitSectionId ? undefined : "join"} className="section-padding bg-muted/30 relative overflow-hidden">
      {/* ReactBits FaultyTerminal: ember CRT glyphs breathing behind the
          benefits + form at low brightness. Guarded by supportsWebGL2() +
          reducedMotion with CSS scanline fallback. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-20">
        {hasWebGL2 && !reducedMotion ? (
          <FaultyTerminal
            mouseReact={false}
            pause={reducedMotion}
            dpr={1}
            brightness={0.35}
            glow={0.5}
            scanlineIntensity={0.4}
            glitchAmount={0.3}
            flickerAmount={0.3}
            tint="#f97316"
            className="opacity-50"
          />
        ) : (
          <div
            className="h-full w-full opacity-40"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, hsl(var(--primary) / 0.06) 0px, hsl(var(--primary) / 0.06) 1px, transparent 1px, transparent 4px)",
            }}
          />
        )}
      </div>
      <div className="events-ambient-orb absolute top-0 right-0 size-96 bg-accent/5 rounded-full blur-3xl -z-10" />
      <div className="events-ambient-orb absolute bottom-0 left-0 size-80 bg-primary/5 rounded-full blur-3xl -z-10" />

      <div className="container-custom">
        <div ref={headerRef} className="text-center mb-16 px-4">
          {reducedMotion ? (
            <TextReveal animation="fade-up">
              <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-black capitalize mb-4 tracking-tighter break-words">
                Join the <GradientTextReveal gradient="from-primary to-accent">Innovation</GradientTextReveal>
              </h2>
            </TextReveal>
          ) : (
            <ScrollFloat
              containerClassName="mb-2"
              textClassName="font-display font-black tracking-tighter text-foreground"
              splitBy="words"
              order="start"
              stagger={0.05}
              scrollStart="top 85%"
              scrollEnd="top 40%"
            >
              Join the Innovation
            </ScrollFloat>
          )}
          <TextReveal animation="fade-up" delay={100}>
            <p className="text-lg sm:text-xl md:text-2xl font-medium tracking-tight leading-snug text-muted-foreground/90 max-w-2xl mx-auto">
              Start your journey towards becoming a future innovator and engineer
            </p>
          </TextReveal>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Benefits */}
          <div className="space-y-6">
            <TextReveal animation="slide-right">
              <h3 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Why Join Us?</h3>
            </TextReveal>
            <div className="grid gap-4">
              {benefits.map((benefit, index) => (
                <BenefitCard key={benefit.title} benefit={benefit} index={index} />
              ))}
            </div>
          </div>

          {/* Enrollment Form */}
          <TextReveal animation="slide-left">
            <EnrollmentCardFrame reducedMotion={reducedMotion} hasWebGL2={hasWebGL2}>
              {/* Decorative elements */}
              <div className="events-ambient-orb absolute -top-10 -right-10 size-40 bg-primary/10 rounded-full blur-2xl" />
              <div className="events-ambient-orb absolute -bottom-10 -left-10 size-40 bg-secondary/10 rounded-full blur-2xl" />

              <div className="relative z-10">
                <h3 className="text-xl sm:text-2xl font-bold mb-6">
                  <GradientTextReveal gradient="from-primary to-accent">
                    Enrollment Form
                  </GradientTextReveal>
                </h3>

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  <div>
                    <label htmlFor="join-name" className="block text-sm font-medium mb-2">Full Name *</label>
                    <Input
                      id="join-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      onBlur={() => handleBlur("name")}
                      required
                      aria-invalid={Boolean(fieldErrors.name)}
                      className={`w-full rounded-xl border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20 ${fieldErrors.name ? "border-destructive" : ""}`}
                    />
                    {fieldErrors.name && <p className="text-destructive text-xs mt-1">{fieldErrors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="join-grade-trigger" className="block text-sm font-medium mb-2">Grade/Class *</label>
                    <Select
                      name="grade"
                      value={formData.grade}
                      onValueChange={(value) => handleChange("grade", value)}
                      required
                    >
                      <SelectTrigger
                        id="join-grade-trigger"
                        className={`w-full rounded-xl border-primary/20 ${fieldErrors.grade ? "border-destructive" : ""}`}
                        onBlur={() => handleBlur("grade")}
                        aria-invalid={Boolean(fieldErrors.grade)}
                      >
                        <SelectValue placeholder="Select your grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Grade 6">Grade 6</SelectItem>
                        <SelectItem value="Grade 7">Grade 7</SelectItem>
                        <SelectItem value="Grade 8">Grade 8</SelectItem>
                        <SelectItem value="Grade 9">Grade 9</SelectItem>
                        <SelectItem value="Grade 10">Grade 10</SelectItem>
                        <SelectItem value="Grade 11">Grade 11</SelectItem>
                        <SelectItem value="Grade 12">Grade 12</SelectItem>
                        <SelectItem value="Grade 13">Grade 13</SelectItem>
                        <SelectItem value="A/L">A/L</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldErrors.grade && <p className="text-destructive text-xs mt-1">{fieldErrors.grade}</p>}
                  </div>

                  <div>
                    <label htmlFor="join-email" className="block text-sm font-medium mb-2">Email Address *</label>
                    <Input
                      id="join-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      onBlur={() => handleBlur("email")}
                      required
                      aria-invalid={Boolean(fieldErrors.email)}
                      className={`w-full rounded-xl border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20 ${fieldErrors.email ? "border-destructive" : ""}`}
                    />
                    {fieldErrors.email && <p className="text-destructive text-xs mt-1">{fieldErrors.email}</p>}
                  </div>

                  <div>
                    <label htmlFor="join-phone" className="block text-sm font-medium mb-2">Phone Number *</label>
                    <Input
                      id="join-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="+94 XX XXX XXXX"
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      onBlur={() => handleBlur("phone")}
                      required
                      aria-invalid={Boolean(fieldErrors.phone)}
                      className={`w-full rounded-xl border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20 ${fieldErrors.phone ? "border-destructive" : ""}`}
                    />
                    {fieldErrors.phone && <p className="text-destructive text-xs mt-1">{fieldErrors.phone}</p>}
                  </div>

                  <div>
                    <label htmlFor="join-interest-trigger" className="block text-sm font-medium mb-2">Interest Area *</label>
                    <Select name="interest" value={formData.interest} onValueChange={(value) => handleChange("interest", value)} required>
                      <SelectTrigger
                        id="join-interest-trigger"
                        className={`w-full rounded-xl border-primary/20 ${fieldErrors.interest ? "border-destructive" : ""}`}
                        onBlur={() => handleBlur("interest")}
                        aria-invalid={Boolean(fieldErrors.interest)}
                      >
                        <SelectValue placeholder="Select your interest" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="robotics">Robotics</SelectItem>
                        <SelectItem value="solar">Solar Energy</SelectItem>
                        <SelectItem value="environmental">Environmental Science</SelectItem>
                        <SelectItem value="programming">Programming</SelectItem>
                        <SelectItem value="design">Design & Engineering</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldErrors.interest && <p className="text-destructive text-xs mt-1">{fieldErrors.interest}</p>}
                  </div>

                  <div>
                    <label htmlFor="join-reason" className="block text-sm font-medium mb-2">
                      Why do you want to join? *
                    </label>
                    <Textarea
                      id="join-reason"
                      name="reason"
                      placeholder="Tell us what you're excited to build! (e.g., 'I want to make a line-following robot')"
                      value={formData.reason}
                      onChange={(e) => handleChange("reason", e.target.value)}
                      onBlur={() => handleBlur("reason")}
                      required
                      minLength={10}
                      maxLength={500}
                      rows={3}
                      aria-invalid={Boolean(fieldErrors.reason)}
                      className={`w-full min-h-[80px] rounded-xl border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20 ${fieldErrors.reason ? "border-destructive" : ""}`}
                    />
                    {fieldErrors.reason && <p className="text-destructive text-xs mt-1">{fieldErrors.reason}</p>}
                  </div>

                  {/* Turnstile Verification */}
                  <div className="mt-4">
                    <Turnstile
                      key={`${turnstileKey}-${isCompactTurnstile ? "compact" : "normal"}`}
                      siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                      size={isCompactTurnstile ? "compact" : "normal"}
                      onSuccess={(token) => {
                        setTurnstileState({
                          token: token || null,
                          compact: isCompactTurnstile,
                          gen: layoutGen,
                        });
                      }}
                      onError={() => {
                        setTurnstileState({
                          token: null,
                          compact: isCompactTurnstile,
                          gen: layoutGen,
                        });
                      }}
                      theme={resolvedTheme === "light" ? "light" : "dark"}
                    />
                  </div>

                  {/* GDPR/CCPA Consent Section */}
                  <div className="space-y-4 mt-2">
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                      <Checkbox
                        id="join-consent"
                        checked={consent}
                        onCheckedChange={(checked) => setConsent(checked as boolean)}
                        className="mt-1"
                      />
                      <label htmlFor="join-consent" className="text-sm leading-relaxed cursor-pointer">
                        I consent to the collection and processing of my personal data for enrollment evaluation purposes.
                        I have read and accept the{" "}
                        <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
                          Privacy Policy
                        </Link>
                        {" "}and{" "}
                        <Link to="/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
                          Terms of Service
                        </Link>.
                      </label>
                    </div>

                    <div className="flex items-start gap-2 text-xs text-muted-foreground p-3 rounded-lg bg-muted/20">
                      <Shield className="size-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <span>
                        <strong className="text-foreground">Your Privacy:</strong> Your data will be stored securely and used only for enrollment processing.
                        You may request access, correction, or deletion at any time by contacting innovators@dharmapala.edu.lk.
                      </span>
                    </div>
                  </div>

                  {/* ReactBits SpecularButton: a real <button type="submit">;
                      the specular sheen follows the pointer and the label
                      carries a ReactBits ShinyText shimmer (frozen while
                      submitting). Disabled semantics unchanged. */}
                  <SpecularButton
                    type="submit"
                    size="lg"
                    // No turnstileError grace: the enrollment insert now
                    // requires a server-verified token, so an enabled button
                    // with no token only dead-ends.
                    disabled={isSubmitting || !consent || !turnstileToken}
                    className="w-full py-6"
                    radius={12}
                    tint="#f97316"
                    tintOpacity={0.24}
                    baseColor="#0a0a0a"
                    textColor="#fafafa"
                    lineColor="#f97316"
                  >
                    <ShinyText
                      text={isSubmitting ? "Submitting..." : "Start Your Innovation Journey"}
                      disabled={isSubmitting}
                      color="#fafafa"
                      className="text-base sm:text-lg font-semibold"
                    />
                  </SpecularButton>
                </form>
              </div>
            </EnrollmentCardFrame>
          </TextReveal>
        </div>
      </div>
    </section>
  );
};

export default JoinUs;
