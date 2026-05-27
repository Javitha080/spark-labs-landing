import { useRef } from "react";
import { m, useInView } from "framer-motion";
import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQItem {
  question: string;
  answer: string;
}

export const faqItems: FAQItem[] = [
  {
    question: "How can my child join the Young Innovators Club?",
    answer:
      "Students of Dharmapala Vidyalaya can join by filling out the membership form on our website or visiting the club room. We accept new members at the start of each term, but students can express interest anytime throughout the year.",
  },
  {
    question: "What age groups does the club cater to?",
    answer:
      "We welcome students from Grade 6 to Grade 13. Our programs are structured into junior (Grades 6–9) and senior (Grades 10–13) tracks, with age-appropriate projects and challenges for each group.",
  },
  {
    question: "Are there any membership fees?",
    answer:
      "There are no membership fees. The club is fully supported by the school and our generous sponsors. All materials, components, and tools for projects are provided free of charge.",
  },
  {
    question: "What kind of projects do members work on?",
    answer:
      "Members work on a wide range of STEM projects including robotics, IoT (Internet of Things), solar energy systems, web and app development, 3D printing, and Arduino-based electronics. Projects are hands-on and designed to solve real-world problems.",
  },
  {
    question: "Do students need prior coding or tech experience?",
    answer:
      "Absolutely not! We start from the basics and provide structured learning paths. Many of our most accomplished members joined with zero technical background. Our mentors and senior students guide newcomers every step of the way.",
  },
  {
    question: "When does the club meet?",
    answer:
      "Regular sessions are held every Saturday from 9:00 AM to 12:00 PM at the school STEM lab. During competition seasons or project deadlines, additional sessions may be scheduled on weekday afternoons.",
  },
  {
    question: "Does the club participate in competitions?",
    answer:
      "Yes! We actively participate in national and international STEM competitions, hackathons, science fairs, and robotics challenges. Our members have won multiple awards at events like the National Science Olympiad and Asia Robotics League.",
  },
  {
    question: "How can parents or organizations support the club?",
    answer:
      "We welcome support in many forms — sponsoring components and equipment, providing mentorship, offering workshop spaces, or financial contributions. Please reach out via our contact form and our team will get in touch.",
  },
];

const FAQ = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 });

  return (
    <section
      id="faq"
      ref={sectionRef}
      className="section-padding relative overflow-hidden"
    >
      {/* Ambient blobs */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-0 w-[350px] h-[350px] bg-secondary/5 rounded-full blur-[100px]" />
      </div>

      <div className="container-custom max-w-4xl">
        {/* Section header */}
        <m.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] bg-primary/10 text-primary border border-primary/20 mb-6">
            FAQ
          </span>
          <h2 className="text-4xl md:text-6xl font-display font-bold uppercase tracking-tight">
            Frequently{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              Asked
            </span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto text-lg font-light">
            Everything you need to know about joining and being part of the Young
            Innovators Club.
          </p>
        </m.div>

        {/* FAQ Accordion */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          {/* Glass container */}
          <div className="glass-card rounded-3xl border border-border/50 p-4 sm:p-8 backdrop-blur-md bg-background/60">
            <Accordion type="single" collapsible className="space-y-2">
              {faqItems.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border border-border/30 rounded-xl px-4 sm:px-6 data-[state=open]:border-primary/30 data-[state=open]:bg-primary/5 transition-all duration-300"
                >
                  <AccordionTrigger className="text-left text-sm sm:text-base font-semibold hover:text-primary transition-colors py-5 [&[data-state=open]>svg]:text-primary">
                    <span className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {item.question}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-5 pl-11 text-sm sm:text-base">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Floating help icon */}
          <div className="absolute -top-4 -right-4 w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/25 rotate-12">
            <HelpCircle className="w-6 h-6 text-primary-foreground" />
          </div>
        </m.div>
      </div>
    </section>
  );
};

export default FAQ;
