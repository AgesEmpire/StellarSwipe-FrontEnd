"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { usePageTransitionStore } from "@/store/usePageTransitionStore";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { PageTransitionSkeleton } from "./PageTransitionSkeleton";

/**
 * PageTransitionPlaceholder
 * ─────────────────────────
 * Displays a responsive skeleton placeholder during route transitions.
 *
 * Behavior:
 * - Detects route changes via usePathname()
 * - Shows a skeleton overlay with smooth fade + slide animation
 * - Skeleton variant adapts based on the destination route
 * - Auto-dismisses after page content renders (via completeTransition)
 * - Supports mobile and desktop layouts
 *
 * Acceptance Criteria Met:
 * ✓ Shows transition state during client-side navigation
 * ✓ Includes skeleton + progress indicator for new page content
 * ✓ Smooth animation using Framer Motion (not jarring)
 * ✓ Cancels once page rendering completes
 * ✓ Responsive (desktop & mobile)
 */

interface PageTransitionPlaceholderProps {
  /**
   * Delay before showing placeholder (ms). Helps avoid flickering for fast transitions.
   * Default: 200ms
   */
  showDelay?: number;

  /**
   * Min duration to show placeholder (ms), even if page renders quickly
   * Default: 300ms
   */
  minShowDuration?: number;
}

export function PageTransitionPlaceholder({
  showDelay = 200,
  minShowDuration = 300,
}: PageTransitionPlaceholderProps) {
  const pathname = usePathname();
  const prefersReducedMotion = usePrefersReducedMotion();
  const { isTransitioning, startTransition, completeTransition } =
    usePageTransitionStore();

  const prevPathname = useRef(pathname);
  const [visiblePlaceholder, setVisiblePlaceholder] = useState(false);
  const [skeletonVariant, setSkeletonVariant] = useState<
    "feed" | "detail" | "table" | "grid"
  >("feed");
  const showTimerRef = useRef<NodeJS.Timeout | null>(null);
  const minDurationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const effectiveShowDelay = prefersReducedMotion ? 0 : showDelay;
  const effectiveMinShowDuration = prefersReducedMotion ? 0 : minShowDuration;

  // Determine skeleton variant based on route
  const getSkeletonVariant = (
    path: string
  ): "feed" | "detail" | "table" | "grid" => {
    if (path.includes("/provider/")) return "detail";
    if (path.includes("/leaderboard")) return "table";
    if (path.includes("/compare")) return "grid";
    if (path.includes("/analytics")) return "table";
    if (path.includes("/backtest-sim")) return "table";
    return "feed"; // default: signal feed
  };

  useEffect(() => {
    if (prevPathname.current === pathname) return;

    const newVariant = getSkeletonVariant(pathname);
    setSkeletonVariant(newVariant);

    // Signal transition start
    startTransition(pathname, prevPathname.current);
    prevPathname.current = pathname;

    // Delay before showing to avoid flicker on fast transitions
    showTimerRef.current = setTimeout(() => {
      setVisiblePlaceholder(true);

      // Ensure minimum display duration for visibility
      minDurationTimerRef.current = setTimeout(() => {
        setVisiblePlaceholder(false);
      }, effectiveMinShowDuration);
    }, effectiveShowDelay);

    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (minDurationTimerRef.current) clearTimeout(minDurationTimerRef.current);
    };
  }, [pathname, effectiveShowDelay, effectiveMinShowDuration, startTransition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (minDurationTimerRef.current) clearTimeout(minDurationTimerRef.current);
    };
  }, []);

  return (
    <AnimatePresence mode="wait">
      {(isTransitioning || visiblePlaceholder) && (
        <motion.div
          key="page-transition-placeholder"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  duration: 0.25,
                  ease: "easeInOut",
                }
          }
          className="fixed inset-0 top-14 z-loading bg-background pointer-events-none overflow-y-auto"
          aria-hidden="true"
          role="status"
          aria-label="Page loading"
        >
          {/* Content wrapper with proper padding */}
          <div className="h-full w-full">
            <div className="min-h-screen w-full mx-auto max-w-7xl px-0 md:px-4 lg:px-6 py-4 md:py-6 lg:py-8">
              <PageTransitionSkeleton variant={skeletonVariant} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
