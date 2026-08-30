"use client";

import { useEffect, useState } from "react";
import { WifiOff, AlertTriangle } from "lucide-react";

type NetworkStatus = "online" | "offline" | "slow";

function detectSlowConnection(): boolean {
  const conn =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & { connection?: { effectiveType?: string } })
          .connection
      : undefined;
  if (!conn) return false;
  return conn.effectiveType === "slow-2g" || conn.effectiveType === "2g";
}

export function NetworkStatusIndicator() {
  const [status, setStatus] = useState<NetworkStatus>("online");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      if (!navigator.onLine) {
        setStatus("offline");
        setVisible(true);
      } else if (detectSlowConnection()) {
        setStatus("slow");
        setVisible(true);
      } else {
        setStatus("online");
      }
    };

    const onOnline = () => {
      setStatus("online");
      setVisible(false);
    };
    const onOffline = () => {
      setStatus("offline");
      setVisible(true);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const conn = (navigator as Navigator & { connection?: EventTarget })
      .connection;
    if (conn) {
      conn.addEventListener("change", updateStatus);
    }

    updateStatus();

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (conn) {
        conn.removeEventListener("change", updateStatus);
      }
    };
  }, []);

  if (!visible || status === "online") return null;

  const isOffline = status === "offline";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium ${
        isOffline
          ? "bg-destructive/90 text-destructive-foreground"
          : "bg-yellow-500/90 text-yellow-950"
      }`}
    >
      {isOffline ? (
        <WifiOff size={16} aria-hidden="true" />
      ) : (
        <AlertTriangle size={16} aria-hidden="true" />
      )}
      <span>
        {isOffline
          ? "You are offline. Some features may be unavailable."
          : "Slow connection detected. Loading may take longer."}
      </span>
    </div>
  );
}
