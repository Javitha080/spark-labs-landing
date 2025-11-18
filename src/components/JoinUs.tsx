import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const JoinUs = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: "", grade: "", email: "", phone: "", interest: "", reason: "" });
  const { ref, isVisible } = useScrollAnimation(0.1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase.from('enrollment_submissions').insert([formData]);
      toast({ title: "Application Submitted! 🎉" });
      setFormData({ name: "", grade: "", email: "", phone: "", interest: "", reason: "" });
    } catch (error) {
      toast({ title: "Submission Failed", variant: "destructive" });
    }
  };

  return (
    <section id="join" ref={ref} className="section-padding bg-muted/30">
      <div className="container-custom max-w-4xl">
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <h2 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">Join the <span className="text-primary">Innovation</span></h2>
          <p className="text-xl text-muted-foreground font-light">Start your journey towards becoming a future innovator</p>
        </div>
        <form onSubmit={handleSubmit} className="border border-border/50 bg-card p-8 rounded-3xl space-y-6">
          <Input placeholder="Full Name" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          <Select value={formData.grade} onValueChange={(val) => setFormData({...formData, grade: val})}>
            <SelectTrigger><SelectValue placeholder="Select Grade" /></SelectTrigger>
            <SelectContent>{["Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="email" placeholder="Email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          <Input type="tel" placeholder="Phone" required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
          <Input placeholder="Area of Interest" required value={formData.interest} onChange={(e) => setFormData({...formData, interest: e.target.value})} />
          <Textarea placeholder="Why do you want to join?" required value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} />
          <Button type="submit" size="lg" className="w-full">Submit Application</Button>
        </form>
      </div>
    </section>
  );
};

export default JoinUs;
