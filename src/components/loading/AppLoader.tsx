import { useState, useEffect, useCallback } from "react";
import CinematicLoader from "./CinematicLoader";

interface AppLoaderProps {
  children: React.ReactNode;
}

const MINIMUM_DISPLAY_TIME = 2500; // 2.5 seconds minimum for brand impact
const SESSION_KEY = "yicdvp_loader_shown";

const AppLoader = ({ children }: AppLoaderProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [hasSeenLoader, setHasSeenLoader] = useState(false);
  const [contentReady, setContentReady] = useState(false);

  // Check if user has seen loader this session
  useEffect(() => {
    const seen = sessionStorage.getItem(SESSION_KEY);
    if (seen === "true") {
      setHasSeenLoader(true);
      setIsLoading(false);
      setProgress(100);
    }
  }, []);

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches 
    : false;

  // Track loading progress
  useEffect(() => {
    if (hasSeenLoader || prefersReducedMotion) {
      setIsLoading(false);
      setProgress(100);
      return;
    }

    const startTime = Date.now();
    let animationFrame: number;
    let documentReady = false;
    let fontsLoaded = false;

    // Check document ready state
    const checkDocumentReady = () => {
      if (document.readyState === "complete") {
        documentReady = true;
      }
    };

    // Check fonts loaded
    const checkFonts = async () => {
      try {
        await document.fonts.ready;
        fontsLoaded = true;
      } catch {
        fontsLoaded = true; // Fallback if fonts API not supported
      }
    };

    // Progress animation
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const baseProgress = Math.min((elapsed / MINIMUM_DISPLAY_TIME) * 100, 100);
      
      // Add some randomness for realism
      const jitter = Math.sin(elapsed / 100) * 2;
      const calculatedProgress = Math.min(baseProgress + jitter, 100);
      
      setProgress(calculatedProgress);

      // Check if we can complete
      if (elapsed >= MINIMUM_DISPLAY_TIME && documentReady && fontsLoaded) {
        setProgress(100);
        setTimeout(() => {
          setContentReady(true);
          sessionStorage.setItem(SESSION_KEY, "true");
        }, 300);
      } else {
        animationFrame = requestAnimationFrame(updateProgress);
      }
    };

    // Initialize checks
    checkDocumentReady();
    checkFonts();

    // Listen for document ready
    if (document.readyState !== "complete") {
      window.addEventListener("load", checkDocumentReady);
    }

    // Start progress animation
    animationFrame = requestAnimationFrame(updateProgress);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("load", checkDocumentReady);
    };
  }, [hasSeenLoader, prefersReducedMotion]);

  // Handle loader completion
  const handleComplete = useCallback(() => {
    setIsLoading(false);
  }, []);

  // If user has seen loader or prefers reduced motion, render children directly
  if (hasSeenLoader || prefersReducedMotion) {
    return <>{children}</>;
  }

  return (
    <>
      <CinematicLoader
        progress={progress}
        isVisible={isLoading && !contentReady}
        onComplete={handleComplete}
      />
      {/* Render children but keep them hidden until loader completes */}
      <div
        style={{
          visibility: contentReady && !isLoading ? "visible" : "hidden",
          opacity: contentReady && !isLoading ? 1 : 0,
          transition: "opacity 0.3s ease-in-out",
        }}
      >
        {children}
      </div>
    </>
  );
};

export default AppLoader;
