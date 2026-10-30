import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Telescope, SearchX } from "lucide-react";
import { m } from "framer-motion";
import { logError } from "@/lib/errors";
import SEOHead from "@/components/SEOHead";
import FuzzyText from "@/components/reactbits/FuzzyText";
import DecryptedText from "@/components/reactbits/DecryptedText";
import FaultyTerminal from "@/components/reactbits/FaultyTerminal";
import Magnet from "@/components/reactbits/Magnet";
import FadeContent from "@/components/reactbits/FadeContent";

const NotFound = () => {
  const location = useLocation();

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // react-doctor-disable no-mutable-in-deps
  useEffect(() => {
    logError(new Error(`404: ${location.pathname}`), "NotFound");
  }, [location.pathname]);

  return (
    <>
      {/* The Worker's SPA fallback serves unknown paths with HTTP 200, so this
          component is the only signal telling crawlers "do not index this". */}
      <SEOHead
        title="Page Not Found | Young Innovators Club"
        description="The page you are looking for does not exist at the Young Innovators Club website."
        path={location.pathname}
        noindex
      />
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden text-center selection:bg-primary/30">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900/50 via-black to-black z-0 pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 size-96 bg-primary/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 size-80 bg-secondary/10 rounded-full blur-[100px] animate-pulse delay-500 pointer-events-none" />

      {/* Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-20 z-0 pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }}
      ></div>

      {/* ReactBits FaultyTerminal: dying-signal CRT glyphs behind the 404
          (darker than the campaign sections); paused under reduced motion. */}
      <div aria-hidden="true" className="absolute inset-0 z-0 pointer-events-none">
        <FaultyTerminal
          mouseReact={false}
          pause={reducedMotion}
          brightness={0.5}
          glow={0.6}
          scanlineIntensity={0.6}
          glitchAmount={0.6}
          flickerAmount={0.6}
          tint="#f97316"
          className="opacity-60"
        />
      </div>

      <div className="relative z-10 max-w-2xl px-4 animate-fade-up">
        <m.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8 relative inline-block"
        >
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
          <Telescope className="size-24 text-primary relative z-10 mx-auto" strokeWidth={1.5} />
          <div className="absolute -top-4 -right-4">
            <SearchX className="size-10 text-muted-foreground/50 animate-none" />
          </div>
        </m.div>

        {/* ReactBits FuzzyText: the giant 404 flickers with unstable fuzz and
            sharpens on hover; plain text under reduced motion (canvas text
            isn't screen-readable, hence the sr-only twin). */}
        <div className="relative mb-2">
          {reducedMotion ? (
            <h1 className="text-8xl md:text-9xl font-black tracking-tighter text-white mb-2">
              404
            </h1>
          ) : (
            <FuzzyText
              fontSize={112}
              fontWeight="900"
              fontFamily="'Space Grotesk', sans-serif"
              color="#f97316"
              baseIntensity={0.22}
              hoverIntensity={0.45}
              enableHover
              className="mb-2"
            >
              404
            </FuzzyText>
          )}
          <span className="sr-only">404</span>
        </div>

        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight">
          {/* ReactBits DecryptedText: the tagline resolves like an incoming
              transmission; static under reduced motion. */}
          {reducedMotion ? (
            "Coordinates Not Found"
          ) : (
            <DecryptedText
              text="Coordinates Not Found"
              speed={50}
              maxIterations={10}
              characters="!<>-_\\/[]{}—=+*^?#"
              animateOn="view"
              className="text-white"
            />
          )}
        </h2>

        <p className="text-muted-foreground text-lg mb-10 max-w-lg mx-auto leading-relaxed">
          The requested trajectory <span className="text-primary font-mono bg-primary/10 px-2 py-0.5 rounded text-sm">{location.pathname}</span> leads into the void. This sector of the archives does not exist or has been reclassified.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* ReactBits Magnet pulls the primary recovery action toward the
              pointer; static on touch + reduced motion. */}
          <Magnet padding={60} disabled={reducedMotion}>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-white/10 hover:bg-white/5 hover:text-white group"
              asChild
            >
              <Link to="/">
                <Home className="size-4 mr-2 group-hover:scale-110 transition-transform" />
                Return to Base
              </Link>
            </Button>
          </Magnet>

          <Button
            variant="ghost"
            size="lg"
            className="w-full sm:w-auto text-muted-foreground hover:text-white"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="size-4 mr-2" />
            Go Back
          </Button>
        </div>

        <div className="mt-16 pt-8 border-t border-white/5">
          {/* ReactBits FadeContent: resolver log fades in once the page
              settles; static text otherwise. */}
          <FadeContent threshold={0.3} delay={0.6}>
            <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em]">
              System Status: Nominal // Sector: Unknown
            </p>
          </FadeContent>
        </div>
      </div>
    </div>
    </>
  );
};

export default NotFound;
