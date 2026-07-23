"use client";

import { useRelativeTime } from "@/hooks/useRelativeTime";

interface RelativeTimestampProps {
  timestamp: Date;
  className?: string;
}

/**
 * Displays a localized relative timestamp (e.g. "2 minutes ago", "3 hours ago")
 * using Intl.RelativeTimeFormat. Falls back to an absolute timestamp if
 * localization fails.
 */
export function RelativeTimestamp({
  timestamp,
  className,
}: RelativeTimestampProps) {
  const label = useRelativeTime(timestamp);

  return <span className={className}>{label}</span>;
}
