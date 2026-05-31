import { useEffect, ReactNode } from 'react';

interface SmoothScrollProps {
  children: ReactNode;
}

export default function SmoothScroll({ children }: SmoothScrollProps) {
  // oxlint-disable-next-line react-doctor/effect-needs-cleanup
  useEffect(() => {
    let lenisInstance: any;
    let gsapInstance: any;
    let tickerCallback: (time: number) => void;

    const initLenis = async () => {
      // Dynamically import heavy animation libraries to keep them out of critical bundle
      const [Lenis, { gsap }, { ScrollTrigger }] = await Promise.all([
        import('lenis').then(m => m.default),
        import('gsap'),
        import('gsap/ScrollTrigger')
      ]);

      gsapInstance = gsap;
      gsap.registerPlugin(ScrollTrigger);

      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isMobile = window.innerWidth < 1024 || isTouchDevice;

      // Enable smooth scrolling with adaptive settings for PC vs Mobile
      lenisInstance = new Lenis({
        duration: isMobile ? 0.8 : 1.5,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: isMobile ? 0.8 : 1.15,
        touchMultiplier: isMobile ? 1.3 : 1.8,
      });
      (window as any).lenis = lenisInstance;

      lenisInstance.on('scroll', ScrollTrigger.update);

      tickerCallback = (time: number) => {
        lenisInstance.raf(time * 1000);
      };
      gsap.ticker.add(tickerCallback);

      gsap.ticker.lagSmoothing(0);
    };

    initLenis();

    return () => {
      if (lenisInstance) {
        lenisInstance.destroy();
      }
      if (gsapInstance && tickerCallback) {
        gsapInstance.ticker.remove(tickerCallback);
      }
    };
  }, []);

  return <>{children}</>;
}
