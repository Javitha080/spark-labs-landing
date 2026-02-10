import { motion } from "framer-motion";

const About = () => {
  return (
    <section className="section-padding bg-background">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
            Who We <span className="text-primary">Are</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            The Young Innovators Club is a student-driven initiative at Dharmapala Vidyalaya, 
            dedicated to fostering creativity, critical thinking, and technological innovation 
            among young minds. We believe every student has the potential to become an innovator 
            and change-maker.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {[
              { title: "Our Mission", description: "To inspire and empower students to explore STEM fields through hands-on projects and mentorship." },
              { title: "Our Vision", description: "A future where every student has access to innovation tools and the confidence to create solutions." },
              { title: "Our Values", description: "Curiosity, collaboration, creativity, and commitment to making a positive impact on society." },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-card border border-border"
              >
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default About;
