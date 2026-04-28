"use client";

import { useRelativeTime } from "@/hooks/useRelativeTime";

interface SignalTimestampProps {
  updatedAt: Date;
}

export function SignalTimestamp({ updatedAt }: SignalTimestampProps) {
  const label = useRelativeTime(updatedAt);
  return (
    <span className="text-xs text-muted-foreground">Updated {label}</span>
  );
}
