import { motion, AnimatePresence } from "framer-motion";
import Logo3D from "./Logo3D";
import LoadingProgress from "./LoadingProgress";
import clubLogo from "@/assets/club-logo.png";

interface CinematicLoaderProps {
  progress: number;
  isExiting: boolean;
}

const CinematicLoader = ({ progress, isExiting }: CinematicLoaderProps) => {
  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          className="fixed inset-0 z-[9999] bg-black overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            filter: "blur(20px)",
            scale: 1.1
          }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-radial from-gray-900/50 via-black to-black" />
          
          {/* Particle effects */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white/20 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -100],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>
          
          {/* Main content */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
            {/* Club logo */}
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.8, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <img 
                src={clubLogo} 
                alt="YICDVP Logo" 
                className="w-16 h-16 md:w-20 md:h-20 object-contain filter grayscale brightness-200"
              />
            </motion.div>
            
            {/* 3D Text */}
            <Logo3D progress={progress} />
            
            {/* Tagline */}
            <motion.p
              className="mt-6 text-white/40 text-sm md:text-base tracking-[0.3em] uppercase font-light"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              Innovation Club
            </motion.p>
            
            {/* Progress bar */}
            <motion.div
              className="absolute bottom-20 left-0 right-0 px-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <LoadingProgress progress={progress} />
            </motion.div>
          </div>
          
          {/* Motion blur overlay on exit */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.5))"
            }}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: progress > 80 ? 0.3 : 0,
              backdropFilter: progress > 80 ? "blur(4px)" : "blur(0px)"
            }}
            transition={{ duration: 0.5 }}
          />
          
          {/* Color transition overlay */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)"
            }}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: progress > 90 ? 0.2 : 0
            }}
            transition={{ duration: 0.8 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CinematicLoader;
