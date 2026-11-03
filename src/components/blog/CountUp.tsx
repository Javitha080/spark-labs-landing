import { useEffect, useRef } from "react";
import { animate, useInView } from "framer-motion";

/** Counts a number up when it scrolls into view; renders "0…" until then. */
export function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const controls = animate(0, to, {
      duration: 1.4,
      ease: "easeOut",
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = `${Math.round(v).toLocaleString()}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [inView, to, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}
