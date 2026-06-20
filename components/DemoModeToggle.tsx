"use client";

import { motion } from "framer-motion";
import { Play, X } from "lucide-react";
import { useDemoModeStore } from "@/store/useDemoModeStore";
import { cn } from "@/lib/utils";

export function DemoModeToggle({ className }: { className?: string }) {
  const { isDemoMode, isHydrated, toggleDemoMode } = useDemoModeStore();
  const active = isHydrated && isDemoMode;

  return (
    <button
      onClick={toggleDemoMode}
      disabled={!isHydrated}
      aria-pressed={active}
      aria-label={
        !isHydrated
          ? "Loading demo mode preference"
          : active
            ? "Exit demo mode"
            : "Enter demo mode"
      }
      className={cn(
        "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30"
          : "bg-foreground/5 text-foreground-muted hover:bg-foreground/10 hover:text-foreground",
        !isHydrated && "cursor-not-allowed opacity-60 hover:bg-foreground/5 hover:text-foreground-muted",
        className
      )}
    >
      <Play size={12} aria-hidden="true" />
      <span>Demo Mode</span>
      {active && (
        <span className="ml-1 rounded bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
          ON
        </span>
      )}
    </button>
  );
}
