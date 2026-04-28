"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavHeader() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-sticky border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight text-foreground hover:text-accent-primary transition-colors">
          StellarSwipe
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/"
            className={cn(
              "text-sm font-medium transition-colors hover:text-accent-primary",
              pathname === "/" ? "text-accent-primary" : "text-foreground-muted"
            )}
          >
            Home
          </Link>
          <Link
            href="/app"
            className={cn(
              "text-sm font-medium transition-colors hover:text-accent-primary",
              pathname === "/app" ? "text-accent-primary" : "text-foreground-muted"
            )}
          >
            Signals
          </Link>
        </div>
      </div>
    </nav>
  );
}
