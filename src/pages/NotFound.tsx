import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Telescope, SearchX } from "lucide-react";
import { motion } from "framer-motion";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden text-center selection:bg-primary/30">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900/50 via-black to-black z-0 pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-[100px] animate-pulse delay-500 pointer-events-none" />

      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0 pointer-events-none mix-blend-overlay"></div>

      <div className="relative z-10 max-w-2xl px-4 animate-fade-up">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8 relative inline-block"
        >
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
          <Telescope className="w-24 h-24 text-primary relative z-10 mx-auto" strokeWidth={1.5} />
          <div className="absolute -top-4 -right-4">
            <SearchX className="w-10 h-10 text-muted-foreground/50 animate-bounce-slow" />
          </div>
        </motion.div>

        <h1 className="text-8xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/10 mb-2">
          404
        </h1>

        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight">
          Coordinates Not Found
        </h2>

        <p className="text-muted-foreground text-lg mb-10 max-w-lg mx-auto leading-relaxed">
          The requested trajectory <span className="text-primary font-mono bg-primary/10 px-2 py-0.5 rounded text-sm">{location.pathname}</span> leads into the void. This sector of the archives does not exist or has been reclassified.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto border-white/10 hover:bg-white/5 hover:text-white group"
            asChild
          >
            <Link to="/">
              <Home className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
              Return to Base
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className="w-full sm:w-auto text-muted-foreground hover:text-white"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>

        <div className="mt-16 pt-8 border-t border-white/5">
          <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em]">
            System Status: Nominal // Sector: Unknown
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
