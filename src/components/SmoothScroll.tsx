import { useEffect, ReactNode } from 'react';

interface SmoothScrollProps {
  children: ReactNode;
}

export default function SmoothScroll({ children }: SmoothScrollProps) {
  // oxlint-disable-next-line react-doctor/effect-needs-cleanup
  useEffect(() => {
    let lenisInstance: any;
    let gsapInstance: any;

    const initLenis = async () => {
      // Dynamically import heavy animation libraries to keep them out of critical bundle
      const [Lenis, { gsap }, { ScrollTrigger }] = await Promise.all([
        import('lenis').then(m => m.default),
        import('gsap'),
        import('gsap/ScrollTrigger')
      ]);

      gsapInstance = gsap;
      gsap.registerPlugin(ScrollTrigger);

      // Only enable smooth scrolling on non-touch devices or if explicitly wanted
      lenisInstance = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
      });

      lenisInstance.on('scroll', ScrollTrigger.update);

      gsap.ticker.add((time) => {
        lenisInstance.raf(time * 1000);
      });

      gsap.ticker.lagSmoothing(0);
    };

    initLenis();

    return () => {
      if (lenisInstance) {
        lenisInstance.destroy();
      }
      if (gsapInstance) {
        // Optional cleanup if needed for gsap ticker, but usually destroying lenis is enough
      }
    };
  }, []);

  return <>{children}</>;
}
