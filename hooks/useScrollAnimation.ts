"use client";

import { useReducedMotion } from "framer-motion";

export const fadeUpVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: "easeOut" },
  }),
};

export const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: (i = 0) => ({
    opacity: 1,
    transition: { delay: i * 0.1, duration: 0.4, ease: "easeOut" },
  }),
};

export function useScrollViewport() {
  const reduced = useReducedMotion();
  return {
    initial: reduced ? "visible" : "hidden",
    whileInView: "visible" as const,
    viewport: { once: true, amount: 0.2 },
  };
}
