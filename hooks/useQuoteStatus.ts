"use client";

import { useEffect, useRef, useState } from "react";

export type QuoteState = "fresh" | "stale" | "unavailable";

export interface QuoteInfo {
  state: QuoteState;
  price: number | null;
  lastUpdated: Date | null;
  timeAgo: string;
}

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export function useQuotePrice(symbol: string, price: number | null, lastUpdated: Date | null): QuoteInfo {
  const [state, setState] = useState<QuoteState>("unavailable");
  const [timeAgo, setTimeAgo] = useState("never");

  useEffect(() => {
    if (price !== null && lastUpdated !== null) {
      const age = Date.now() - lastUpdated.getTime();
      
      if (age > STALE_THRESHOLD_MS) {
        setState("stale");
      } else {
        setState("fresh");
      }
      
      const secs = Math.floor(age / 1000);
      if (secs < 5) {
        setTimeAgo("just now");
      } else if (secs < 60) {
        setTimeAgo(`${secs}s ago`);
      } else {
        setTimeAgo(`${Math.floor(secs / 60)}m ago`);
      }
    } else {
      setState("unavailable");
      setTimeAgo("never");
    }
  }, [price, lastUpdated]);

  return { state, price, lastUpdated, timeAgo };
}

// Alias for backward compatibility
export const useQuoteStatus = useQuotePrice;
