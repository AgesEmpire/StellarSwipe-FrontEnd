import { useEffect, useRef, useState } from "react";

export interface SignalPrice {
  executionPrice: number;
  roi: number;
  confidence: number;
  updatedAt: Date;
}

type FlashColor = "up" | "down" | null;

// Mock polling — replace with real WebSocket/API call
function mockFetchPrice(current: SignalPrice): SignalPrice {
  const delta = (Math.random() - 0.48) * 0.002;
  const newPrice = parseFloat((current.executionPrice + delta).toFixed(4));
  const roiDelta = (Math.random() - 0.48) * 0.5;
  const newRoi = parseFloat((current.roi + roiDelta).toFixed(2));
  const confDelta = Math.floor((Math.random() - 0.5) * 3);
  const newConf = Math.min(100, Math.max(0, current.confidence + confDelta));
  return { executionPrice: newPrice, roi: newRoi, confidence: newConf, updatedAt: new Date() };
}

export function useSignalPrice(intervalMs = 3000) {
  const [price, setPrice] = useState<SignalPrice>({
    executionPrice: 0.4821,
    roi: 12.4,
    confidence: 78,
    updatedAt: new Date(),
  });
  const [flash, setFlash] = useState<FlashColor>(null);
  const [relativeTime, setRelativeTime] = useState("just now");
  const prevRef = useRef(price);

  // Price polling
  useEffect(() => {
    const id = setInterval(() => {
      setPrice((prev) => {
        const next = mockFetchPrice(prev);
        const dir = next.executionPrice > prev.executionPrice ? "up" : next.executionPrice < prev.executionPrice ? "down" : null;
        if (dir) {
          setFlash(dir);
          setTimeout(() => setFlash(null), 900);
        }
        prevRef.current = next;
        return next;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  // Relative timestamp — refreshes every 60s
  useEffect(() => {
    const fmt = () => {
      const secs = Math.floor((Date.now() - price.updatedAt.getTime()) / 1000);
      if (secs < 5) return "just now";
      if (secs < 60) return `updated ${secs}s ago`;
      return `updated ${Math.floor(secs / 60)}m ago`;
    };
    setRelativeTime(fmt());
    const id = setInterval(() => setRelativeTime(fmt()), 60_000);
    return () => clearInterval(id);
  }, [price.updatedAt]);

  return { price, flash, relativeTime };
}
