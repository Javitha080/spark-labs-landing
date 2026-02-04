import { motion } from "framer-motion";

interface Logo3DProps {
  isAnimating: boolean;
}

const Logo3D = ({ isAnimating }: Logo3DProps) => {
  const letters = "YICDVP".split("");

  const containerVariants = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.3,
      },
    },
  };

  const letterVariants = {
    initial: {
      opacity: 0,
      z: -500,
      scale: 0.5,
      rotateX: 45,
      filter: "blur(10px)",
    },
    animate: {
      opacity: 1,
      z: 0,
      scale: 1,
      rotateX: 0,
      filter: "blur(0px)",
      transition: {
        duration: 0.8,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    },
  };

  const glowVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: [0, 1, 0.5, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatType: "reverse" as const,
      },
    },
  };

  return (
    <div
      className="relative perspective-[1500px]"
      style={{ perspective: "1500px" }}
    >
      {/* Background glow */}
      <motion.div
        variants={glowVariants}
        initial="initial"
        animate={isAnimating ? "animate" : "initial"}
        className="absolute inset-0 blur-3xl bg-gradient-to-r from-primary/30 via-secondary/30 to-accent/30 rounded-full scale-150"
      />

      {/* 3D Text Container */}
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate={isAnimating ? "animate" : "initial"}
        className="relative flex items-center justify-center gap-1 md:gap-2"
        style={{
          transformStyle: "preserve-3d",
        }}
      >
        {letters.map((letter, index) => (
          <motion.span
            key={index}
            variants={letterVariants}
            className="text-6xl md:text-8xl lg:text-9xl font-bold text-foreground inline-block"
            style={{
              transformStyle: "preserve-3d",
              textShadow: `
                0 0 20px hsl(var(--primary) / 0.5),
                0 0 40px hsl(var(--primary) / 0.3),
                0 0 60px hsl(var(--primary) / 0.2)
              `,
            }}
          >
            {letter}
          </motion.span>
        ))}
      </motion.div>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={isAnimating ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="text-center text-sm md:text-base text-muted-foreground mt-4 tracking-[0.3em] uppercase"
      >
        Young Innovators Club
      </motion.p>
    </div>
  );
};

export default Logo3D;
