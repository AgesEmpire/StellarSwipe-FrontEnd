import { useState, useEffect } from "react";

function getRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function useRelativeTime(date: Date): string {
  const [label, setLabel] = useState(() => getRelativeTime(date));

  useEffect(() => {
    setLabel(getRelativeTime(date));
    const id = setInterval(() => setLabel(getRelativeTime(date)), 60_000);
    return () => clearInterval(id);
  }, [date]);

  return label;
}
