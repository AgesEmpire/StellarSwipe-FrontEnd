"use client";

import { Bookmark, BookOpen, GitCompareArrows } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateVariant = "bookmarks" | "journal" | "comparison";

interface EmptyStateComponentProps {
  variant: EmptyStateVariant;
  action?: ReactNode;
}

const VARIANTS: Record<
  EmptyStateVariant,
  {
    Icon: React.ElementType;
    illustrationColor: string;
    title: string;
    description: string;
    ariaLabel: string;
  }
> = {
  bookmarks: {
    Icon: Bookmark,
    illustrationColor: "text-amber-400/70",
    title: "No bookmarks yet",
    description:
      "Save your favorite signals and providers here for quick access later.",
    ariaLabel: "No bookmarks",
  },
  journal: {
    Icon: BookOpen,
    illustrationColor: "text-emerald-400/70",
    title: "Start your trading journal",
    description:
      "Track your trades, reflect on decisions, and improve your strategy over time.",
    ariaLabel: "Trading journal empty",
  },
  comparison: {
    Icon: GitCompareArrows,
    illustrationColor: "text-sky-400/70",
    title: "Add items to compare",
    description:
      "Select two or more signals or providers to see a side-by-side comparison.",
    ariaLabel: "No items to compare",
  },
};

export function EmptyState({
  variant,
  action,
}: EmptyStateComponentProps) {
  const { Icon, illustrationColor, title, description, ariaLabel } =
    VARIANTS[variant];

  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className="flex flex-col items-center justify-center gap-5 rounded-3xl border border-white/10 bg-slate-900/60 px-6 py-16 text-center"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-slate-800/80">
        <Icon className={`h-9 w-9 ${illustrationColor}`} aria-hidden="true" />
      </div>

      <div className="max-w-sm">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mt-1.5 text-sm text-foreground-muted">{description}</p>
      </div>

      {action && (
        <div className="flex items-center gap-3">{action}</div>
      )}
    </div>
  );
}
