import { motion } from "framer-motion";

interface Logo3DProps {
  progress: number;
}

const Logo3D = ({ progress }: Logo3DProps) => {
  const letters = "YICDVP".split("");
  
  return (
    <div className="perspective-1000 flex items-center justify-center">
      <motion.div
        className="flex gap-2 md:gap-4 preserve-3d"
        initial={{ rotateX: 20, rotateY: -10 }}
        animate={{ 
          rotateX: 0, 
          rotateY: 0,
          z: progress * 200
        }}
        transition={{ duration: 2, ease: "easeOut" }}
      >
        {letters.map((letter, index) => (
          <motion.span
            key={index}
            className="text-6xl md:text-8xl lg:text-9xl font-bold text-white inline-block preserve-3d"
            style={{
              textShadow: `
                0 0 20px rgba(255, 255, 255, 0.5),
                0 0 40px rgba(255, 255, 255, 0.3),
                0 0 60px rgba(255, 255, 255, 0.2)
              `,
            }}
            initial={{ 
              opacity: 0, 
              z: -500,
              rotateY: -45
            }}
            animate={{ 
              opacity: 1, 
              z: 0,
              rotateY: 0
            }}
            transition={{ 
              delay: index * 0.1,
              duration: 0.8,
              ease: [0.16, 1, 0.3, 1]
            }}
          >
            {letter}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
};

export default Logo3D;
