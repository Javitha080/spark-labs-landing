import { motion } from "framer-motion";
import { Award, Users, Lightbulb, Trophy } from "lucide-react";

const impacts = [
  { icon: Users, label: "Active Members", value: "100+" },
  { icon: Lightbulb, label: "Projects Completed", value: "50+" },
  { icon: Trophy, label: "Awards Won", value: "15+" },
  { icon: Award, label: "Competitions Entered", value: "30+" },
];

const Impact = () => {
  return (
    <section className="section-padding bg-muted/30">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Our <span className="text-primary">Impact</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Numbers that reflect our commitment to nurturing innovation.
          </p>
        </motion.div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {impacts.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="flex flex-col items-center p-6 rounded-2xl bg-card border border-border"
            >
              <item.icon className="w-8 h-8 text-primary mb-3" />
              <span className="text-3xl font-bold">{item.value}</span>
              <span className="text-sm text-muted-foreground mt-1">{item.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Impact;
