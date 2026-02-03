import { motion } from "framer-motion";

interface LoadingProgressProps {
  progress: number;
}

const LoadingProgress = ({ progress }: LoadingProgressProps) => {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative h-1 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-white/60 via-white to-white/60 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
        
        {/* Glow effect */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
            width: "30%",
          }}
          animate={{
            x: ["-100%", "400%"],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>
      
      <motion.p
        className="text-white/50 text-sm mt-4 text-center font-light tracking-widest"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        LOADING INNOVATION
      </motion.p>
    </div>
  );
};

export default LoadingProgress;
