// react-doctor-disable only-export-components
import { useRef } from "react";
import { m, useInView } from "framer-motion";
import { HelpCircle } from "lucide-react";
import GradientText from "@/components/reactbits/GradientText";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// FAQ content lives in @/lib/faqData so the Worker bot-prerender can serve the
// identical FAQPage structured data without importing React into the Worker.
import { faqItems } from "@/lib/faqData";

// Re-exported for backward compatibility (Index.tsx imports faqItems from here).
// eslint-disable-next-line react-refresh/only-export-components
export { faqItems };

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
        <div className="absolute top-0 right-1/4 size-[400px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-0 size-[350px] bg-secondary/5 rounded-full blur-[100px]" />
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
            {/* ReactBits GradientText: ember sweep on the accent word;
                CSS-animation, so the site's global reduced-motion kill
                switch freezes it. */}
            <GradientText colors={["#f97316", "#fdba74", "#ea580c"]}>
              Asked
            </GradientText>
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
                  key={item.question}
                  value={`item-${index}`}
                  className="border border-border/30 rounded-xl px-4 sm:px-6 data-[state=open]:border-primary/30 data-[state=open]:bg-primary/5 transition-all duration-300"
                >
                  <AccordionTrigger className="text-left text-sm sm:text-base font-semibold hover:text-primary transition-colors py-5 [&[data-state=open]>svg]:text-primary">
                    <span className="flex items-center gap-3">
                      <span className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">
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
          <div className="absolute -top-4 -right-4 size-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/25 rotate-12">
            <HelpCircle className="size-6 text-primary-foreground" />
          </div>
        </m.div>
      </div>
    </section>
  );
};

export default FAQ;
