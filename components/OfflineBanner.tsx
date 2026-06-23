"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";

// Shown only while offline, to make clear the feed is cached and possibly stale.
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 w-full bg-amber-500/95 px-4 py-2 text-center text-sm font-medium text-amber-950"
    >
      You are offline. Showing the last loaded signals, which may be out of date.
    </div>
  );
}
