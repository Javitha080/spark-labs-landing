import { useRef } from "react";
import { m, useInView } from "framer-motion";
import { Quote, Star } from "lucide-react";
import {
  StaggerChildren,
  StaggerItem,
} from "@/components/animation/ScrollAnimations";

interface Testimonial {
  name: string;
  role: string;
  quote: string;
  avatar: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    name: "Kavitha Perera",
    role: "Student, Grade 11",
    quote:
      "Joining YICDVP changed how I see technology. I built my first robot and learned to code — things I never imagined doing at school.",
    avatar: "KP",
    rating: 5,
  },
  {
    name: "Mr. Ranjith Fernando",
    role: "Parent",
    quote:
      "My son's confidence has grown tremendously. The club doesn't just teach tech — it teaches problem-solving and teamwork.",
    avatar: "RF",
    rating: 5,
  },
  {
    name: "Amaya Silva",
    role: "Student, Grade 10",
    quote:
      "The solar energy project was incredible. We actually installed panels and measured real output data. It felt like real engineering!",
    avatar: "AS",
    rating: 5,
  },
  {
    name: "Dr. Nimal Jayasuriya",
    role: "STEM Education Advocate",
    quote:
      "YICDVP is a model for what student-led innovation can look like in Sri Lankan schools. Truly inspiring work.",
    avatar: "NJ",
    rating: 5,
  },
  {
    name: "Tharushi Bandara",
    role: "Student, Grade 12",
    quote:
      "I went from knowing nothing about IoT to presenting our smart classroom project at a national competition. This club is life-changing.",
    avatar: "TB",
    rating: 5,
  },
  {
    name: "Ms. Dilini Rathnayake",
    role: "Teacher & Mentor",
    quote:
      "The dedication of these students is remarkable. They stay after school, troubleshoot circuits, debug code — all with genuine passion.",
    avatar: "DR",
    rating: 5,
  },
];

const gradientAvatars = [
  "from-violet-500 to-fuchsia-500",
  "from-cyan-500 to-blue-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-rose-500",
  "from-indigo-500 to-purple-500",
  "from-pink-500 to-amber-500",
];

const TestimonialCard = ({
  testimonial,
  index,
}: {
  testimonial: Testimonial;
  index: number;
}) => {
  return (
    <StaggerItem>
      <m.div
        className="group relative h-full"
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* Glow effect on hover */}
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/30 via-secondary/20 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />

        <div className="relative h-full glass-card rounded-2xl border border-border/50 p-6 sm:p-8 backdrop-blur-md bg-background/60 hover:border-primary/30 transition-all duration-300 flex flex-col">
          {/* Quote icon */}
          <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Quote className="w-10 h-10 text-primary" />
          </div>

          {/* Stars */}
          <div className="flex gap-1 mb-4">
            {Array.from({ length: testimonial.rating }).map((_, i) => (
              <Star
                key={i}
                className="w-4 h-4 text-amber-400 fill-amber-400"
              />
            ))}
          </div>

          {/* Quote text */}
          <blockquote className="text-foreground/90 leading-relaxed text-sm sm:text-base flex-1 mb-6 italic">
            "{testimonial.quote}"
          </blockquote>

          {/* Author */}
          <div className="flex items-center gap-3 pt-4 border-t border-border/50">
            <div
              className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradientAvatars[index % gradientAvatars.length]} flex items-center justify-center text-white text-xs font-bold shadow-lg`}
            >
              {testimonial.avatar}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-foreground truncate">
                {testimonial.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {testimonial.role}
              </p>
            </div>
          </div>
        </div>
      </m.div>
    </StaggerItem>
  );
};

const Testimonials = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 });

  return (
    <section
      id="testimonials"
      ref={sectionRef}
      className="py-20 md:py-32 relative overflow-hidden"
    >
      {/* Ambient background blobs */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4">
        {/* Section header */}
        <m.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] bg-primary/10 text-primary border border-primary/20 mb-6">
            Testimonials
          </span>
          <h2 className="text-4xl md:text-6xl font-display font-bold uppercase tracking-tight">
            What People{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              Say
            </span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto text-lg font-light">
            Hear from students, parents, and mentors about their experience with
            the Young Innovators Club.
          </p>
        </m.div>

        {/* Testimonial grid */}
        <StaggerChildren
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          staggerDelay={0.08}
        >
          {testimonials.map((testimonial, i) => (
            <TestimonialCard
              key={testimonial.name}
              testimonial={testimonial}
              index={i}
            />
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
};

export default Testimonials;
