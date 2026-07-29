"use client";

import { ReactNode, useEffect, useState } from "react";

interface ProgressiveSectionProps {
  children: ReactNode;
  fallback?: ReactNode;
  delay?: number;
  className?: string;
}

function DefaultSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse space-y-3 ${className ?? ""}`}
      aria-hidden="true"
    >
      <div className="h-4 w-3/4 rounded bg-muted" />
      <div className="h-4 w-1/2 rounded bg-muted" />
      <div className="h-4 w-5/6 rounded bg-muted" />
    </div>
  );
}

export function ProgressiveSection({
  children,
  fallback,
  delay = 0,
  className,
}: ProgressiveSectionProps) {
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const schedule =
      "requestIdleCallback" in window
        ? (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => void })
            .requestIdleCallback
        : undefined;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let idleId: ReturnType<typeof schedule> | undefined;

    const idleCallback = () => setRendered(true);

    if (schedule) {
      idleId = schedule(idleCallback, { timeout: delay });
    } else {
      timer = setTimeout(idleCallback, delay);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (idleId && "cancelIdleCallback" in window) {
        (window as Window & { cancelIdleCallback?: (id: ReturnType<typeof schedule>) => void }).cancelIdleCallback?.(idleId);
      }
    };
  }, [delay]);

  if (rendered) {
    return <>{children}</>;
  }

  return (
    <div className={className}>
      {fallback ?? <DefaultSkeleton className={className} />}
    </div>
  );
}
