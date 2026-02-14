import { useState, memo } from "react";
import { CheckCircle, Award, Users, FileText, Briefcase, Trophy, LucideIcon, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TextReveal, GradientTextReveal } from "@/components/animation/TextReveal";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
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
      <div className={`w-14 h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br ${benefit.gradient} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg`}>
        <benefit.icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
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

const JoinUs = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consent, setConsent] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    grade: "",
    email: "",
    phone: "",
    interest: "",
    reason: ""
  });
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate consent
    if (!consent) {
      toast({
        title: "Consent Required",
        description: "Please agree to the privacy policy to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Check rate limit before submitting
      const { data: canSubmit, error: rateLimitError } = await supabase.rpc('check_enrollment_rate_limit', {
        p_email: formData.email.toLowerCase().trim()
      });

      if (rateLimitError) {
        console.error('Rate limit check failed:', rateLimitError);
      }

      if (canSubmit === false) {
        toast({
          title: "Please Wait",
          description: "You've submitted too many applications recently. Please try again in an hour.",
          variant: "destructive",
        });
        return;
      }

      const { error: dbError } = await supabase
        .from('enrollment_submissions')
        .insert([{
          ...formData,
          consent_given: consent,
          consent_timestamp: new Date().toISOString(),
          privacy_policy_version: 'v1.0_2025-01-22'
        }]);

      if (dbError) throw dbError;

      const { error: emailError } = await supabase.functions.invoke('send-enrollment-notification', {
        body: formData
      });

      if (emailError) {
        console.error('Email notification failed:', emailError);
      }

      toast({
        title: "Application Submitted! 🎉",
        description: "We'll review your application and get back to you soon.",
      });

      setFormData({ name: "", grade: "", email: "", phone: "", interest: "", reason: "" });
      setConsent(false);
    } catch (error) {
      console.error('Submission error:', error);
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
    <section id="join" className="section-padding bg-muted/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl -z-10" />

      <div className="container-custom">
        <div ref={headerRef} className="text-center mb-16">
          <TextReveal animation="fade-up">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Join the <GradientTextReveal gradient="from-primary via-secondary to-accent">Innovation</GradientTextReveal>
            </h2>
          </TextReveal>
          <TextReveal animation="fade-up" delay={100}>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
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
                <BenefitCard key={index} benefit={benefit} index={index} />
              ))}
            </div>
          </div>

          {/* Enrollment Form */}
          <TextReveal animation="slide-left">
            <div className="glass-card p-6 sm:p-8 lg:p-10 rounded-3xl relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary/10 rounded-full blur-2xl" />

              <div className="relative z-10">
                <h3 className="text-xl sm:text-2xl font-bold mb-6">
                  <GradientTextReveal gradient="from-primary via-secondary to-accent">
                    Enrollment Form
                  </GradientTextReveal>
                </h3>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-2">Full Name *</label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full rounded-xl border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label htmlFor="grade" className="block text-sm font-medium mb-2">Grade/Class *</label>
                    <Input
                      id="grade"
                      name="grade"
                      type="text"
                      placeholder="e.g., Grade 10"
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      required
                      className="w-full rounded-xl border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">Email Address *</label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full rounded-xl border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium mb-2">Phone Number *</label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="+94 XX XXX XXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      className="w-full rounded-xl border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label htmlFor="interest-trigger" className="block text-sm font-medium mb-2">Interest Area *</label>
                    <Select name="interest" onValueChange={(value) => setFormData({ ...formData, interest: value })} required>
                      <SelectTrigger id="interest-trigger" className="w-full rounded-xl border-primary/20">
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
                  </div>

                  <div>
                    <label htmlFor="reason" className="block text-sm font-medium mb-2">
                      Why do you want to join? <span className="text-muted-foreground font-normal ml-1">(Optional)</span>
                    </label>
                    <Textarea
                      id="reason"
                      name="reason"
                      placeholder="Tell us what you're excited to build! (e.g., 'I want to make a line-following robot')"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      rows={3}
                      className="w-full min-h-[80px] rounded-xl border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  {/* GDPR/CCPA Consent Section */}
                  <div className="space-y-4 mt-2">
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                      <Checkbox
                        id="consent"
                        checked={consent}
                        onCheckedChange={(checked) => setConsent(checked as boolean)}
                        className="mt-1"
                      />
                      <label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer">
                        I consent to the collection and processing of my personal data for enrollment evaluation purposes.
                        I have read and accept the{" "}
                        <Link to="/privacy-policy" target="_blank" className="text-primary underline hover:text-primary/80">
                          Privacy Policy
                        </Link>
                        {" "}and{" "}
                        <Link to="/terms" target="_blank" className="text-primary underline hover:text-primary/80">
                          Terms of Service
                        </Link>.
                      </label>
                    </div>

                    <div className="flex items-start gap-2 text-xs text-muted-foreground p-3 rounded-lg bg-muted/20">
                      <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong className="text-foreground">Your Privacy:</strong> Your data will be stored securely and used only for enrollment processing.
                        You may request access, correction, or deletion at any time by contacting innovators@dharmapala.edu.lk.
                      </span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || !consent}
                    className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-lg py-6 rounded-xl shadow-lg hover:shadow-primary/50 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? "Submitting..." : "Start Your Innovation Journey"}
                  </Button>
                </form>
              </div>
            </div>
          </TextReveal>
        </div>
      </div>
    </section>
  );
};

export default JoinUs;
