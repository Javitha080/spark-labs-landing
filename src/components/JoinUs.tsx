import { useState } from "react";
import { CheckCircle, Award, Users, FileText, Briefcase, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const JoinUs = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    setIsSubmitting(true);

    try {
      const { error: dbError } = await supabase
        .from('enrollment_submissions')
        .insert([formData]);

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

  const benefits = [
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
              {benefits.map((benefit, index) => {
                const { ref, isVisible } = useScrollAnimation({
                  threshold: 0.3,
                  triggerOnce: true,
                });

                return (
                  <div
                    key={index}
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
              })}
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
                    <label className="block text-sm font-medium mb-2">Full Name *</label>
                    <Input
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full rounded-xl border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Grade/Class *</label>
                    <Input
                      type="text"
                      placeholder="e.g., Grade 10"
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      required
                      className="w-full rounded-xl border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Email Address *</label>
                    <Input
                      type="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full rounded-xl border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Phone Number *</label>
                    <Input
                      type="tel"
                      placeholder="+94 XX XXX XXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      className="w-full rounded-xl border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Interest Area *</label>
                    <Select onValueChange={(value) => setFormData({ ...formData, interest: value })} required>
                      <SelectTrigger className="w-full rounded-xl border-primary/20">
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
                    <label className="block text-sm font-medium mb-2">Why do you want to join? *</label>
                    <Textarea
                      placeholder="Tell us about your interests and what you hope to learn..."
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      required
                      className="w-full min-h-[120px] rounded-xl border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-lg py-6 rounded-xl shadow-lg hover:shadow-primary/50 transition-all"
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
