"use client";

import { motion } from "framer-motion";
import { BookOpen, RadioTower, RefreshCw, SearchX, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

type EmptyStateVariant = "no-signals" | "no-results";

interface SignalEmptyStateProps {
  /** Controls which copy and icon are shown.
   *  - "no-signals"  — initial load / no signals published yet (default)
   *  - "no-results"  — active filters returned zero matches
   */
  variant?: EmptyStateVariant;
  onRefresh: () => void;
}

const VARIANTS: Record<
  EmptyStateVariant,
  {
    Icon: React.ElementType;
    heading: string;
    body: string;
    ariaLabel: string;
  }
> = {
  "no-signals": {
    Icon: RadioTower,
    heading: "No signals available right now",
    body: "New signals appear as providers publish them. Follow providers to get notified first.",
    ariaLabel: "No signals available",
  },
  "no-results": {
    Icon: SearchX,
    heading: "No signals match your filters",
    body: "Try adjusting or clearing your filters to see more signals.",
    ariaLabel: "No signals match the current filters",
  },
};

export function SignalEmptyState({
  variant = "no-signals",
  onRefresh,
}: SignalEmptyStateProps) {
  const { Icon, heading, body, ariaLabel } = VARIANTS[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <EmptyState
        ariaLabel={ariaLabel}
        title={heading}
        description={body}
        className="py-16"
        icon={<Icon className="h-8 w-8 text-sky-400/70" />}
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            className="gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            {variant === "no-results" ? "Clear & Refresh" : "Refresh"}
          </Button>
        }
        secondaryAction={
          variant === "no-signals" ? (
            <>
              <Button size="sm" asChild className="gap-2">
                <Link href="/providers">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  Follow Providers
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild className="gap-2">
                <a
                  href="https://docs.stellarswipe.io"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  Browse Docs
                </a>
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" asChild className="gap-2">
              <a
                href="https://docs.stellarswipe.io"
                target="_blank"
                rel="noopener noreferrer"
              >
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                Browse Docs
              </a>
            </Button>
          )
        }
      />
    </motion.div>
  );
}
