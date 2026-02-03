import { useState, useEffect, ReactNode } from "react";
import CinematicLoader from "./CinematicLoader";

interface AppLoaderProps {
  children: ReactNode;
}

const AppLoader = ({ children }: AppLoaderProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;
  
  // Check if this is a return visit in the same session
  const isReturnVisit = typeof sessionStorage !== 'undefined' 
    ? sessionStorage.getItem('yicdvp-loaded') === 'true'
    : false;
  
  useEffect(() => {
    // Skip loader for return visits or reduced motion preference
    if (isReturnVisit || prefersReducedMotion) {
      setIsLoading(false);
      return;
    }
    
    // Simulate progress based on actual document loading
    const startTime = Date.now();
    const minDisplayTime = 2500; // Minimum 2.5 seconds for brand impact
    
    // Progress simulation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev;
        // Faster at start, slower near end
        const increment = Math.max(1, 10 - (prev / 15));
        return Math.min(95, prev + increment);
      });
    }, 100);
    
    // Check document ready state
    const checkReady = () => {
      if (document.readyState === 'complete') {
        const elapsed = Date.now() - startTime;
        const remainingTime = Math.max(0, minDisplayTime - elapsed);
        
        // Complete progress
        setTimeout(() => {
          setProgress(100);
          
          // Start exit animation after brief pause
          setTimeout(() => {
            setIsExiting(true);
            
            // Hide loader after exit animation
            setTimeout(() => {
              setIsLoading(false);
              sessionStorage.setItem('yicdvp-loaded', 'true');
            }, 800);
          }, 300);
        }, remainingTime);
      }
    };
    
    if (document.readyState === 'complete') {
      // If already loaded, still show minimum time
      setTimeout(() => {
        setProgress(100);
        setTimeout(() => {
          setIsExiting(true);
          setTimeout(() => {
            setIsLoading(false);
            sessionStorage.setItem('yicdvp-loaded', 'true');
          }, 800);
        }, 300);
      }, minDisplayTime);
    } else {
      document.addEventListener('readystatechange', checkReady);
    }
    
    return () => {
      clearInterval(progressInterval);
      document.removeEventListener('readystatechange', checkReady);
    };
  }, [isReturnVisit, prefersReducedMotion]);
  
  return (
    <>
      {isLoading && <CinematicLoader progress={progress} isExiting={isExiting} />}
      <div 
        style={{ 
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.5s ease-in-out'
        }}
      >
        {children}
      </div>
    </>
  );
};

export default AppLoader;
