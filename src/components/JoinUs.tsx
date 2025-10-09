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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Save to database
      const { error: dbError } = await supabase
        .from('enrollment_submissions')
        .insert([formData]);

      if (dbError) throw dbError;

      // Send notification email
      const { error: emailError } = await supabase.functions.invoke('send-enrollment-notification', {
        body: formData
      });

      if (emailError) {
        console.error('Email notification failed:', emailError);
        // Don't throw - enrollment was saved even if email fails
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
    <section id="join" className="section-padding">
      <div className="container-custom">
        <div className="text-center mb-16 animate-fade-up">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Join the <span className="gradient-text">Innovation</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start your journey towards becoming a future innovator and engineer
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Benefits */}
          <div className="space-y-6">
            <h3 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Why Join Us?</h3>
            <div className="grid gap-3 sm:gap-4">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="glass-card p-4 sm:p-6 rounded-xl flex items-center gap-3 sm:gap-4 hover:scale-105 transition-all duration-300"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br ${benefit.gradient} flex items-center justify-center flex-shrink-0`}>
                    <benefit.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h4 className="text-base sm:text-lg font-semibold">{benefit.title}</h4>
                </div>
              ))}
            </div>
          </div>

          {/* Enrollment Form */}
          <div className="glass-card p-6 sm:p-8 rounded-2xl">
            <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Enrollment Form</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Full Name</label>
                <Input
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Grade/Class</label>
                <Input
                  type="text"
                  placeholder="e.g., Grade 10"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="+94 XX XXX XXXX"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Interest Area</label>
                <Select onValueChange={(value) => setFormData({ ...formData, interest: value })} required>
                  <SelectTrigger className="w-full">
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
                <label className="block text-sm font-medium mb-2">Why do you want to join?</label>
                <Textarea
                  placeholder="Tell us about your interests and what you hope to learn..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                  className="w-full min-h-[100px]"
                />
              </div>

              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Start Your Innovation Journey"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default JoinUs;
