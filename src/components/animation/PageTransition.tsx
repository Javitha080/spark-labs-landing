import { m } from "framer-motion";
import { ReactNode } from "react";
import { prefersReducedMotion } from "@/lib/motion";

interface PageTransitionProps {
  children: ReactNode;
}

const pageVariants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.25,
      ease: "easeOut" as const,
    },
  },
} satisfies Record<string, unknown>;

const PageTransition = ({ children }: PageTransitionProps) => {
  const isReduced = prefersReducedMotion();

  if (isReduced) {
    return <div>{children}</div>;
  }

  return (
    <m.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      {children}
    </m.div>
  );
};

export default PageTransition;
