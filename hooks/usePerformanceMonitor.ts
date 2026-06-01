"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { usePerformanceStore } from "@/store/usePerformanceStore";

/**
 * Initialises performance monitoring for the current session.
 * Must be mounted once at the app root (inside Providers).
 *
 * Tracks:
 *  - Route load times (Navigation Timing API)
 *  - Memory usage (performance.memory, Chrome only)
 *  - Network type (Network Information API)
 *  - Unhandled errors / promise rejections (crash reports)
 */
export function usePerformanceMonitor() {
  const pathname = usePathname();
  const store = usePerformanceStore();
  const routeStartRef = useRef<number>(Date.now());

  // ── Route load time ────────────────────────────────────────────────────────
  useEffect(() => {
    const loadTime = Date.now() - routeStartRef.current;
    store.addRouteMetric({ route: pathname, loadTimeMs: loadTime, timestamp: Date.now() });
    routeStartRef.current = Date.now();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Memory usage (Chrome only) ─────────────────────────────────────────────
  useEffect(() => {
    function sampleMemory() {
      const perf = performance as any;
      if (perf?.memory?.usedJSHeapSize) {
        const mb = Math.round(perf.memory.usedJSHeapSize / 1_048_576);
        store.setMemoryUsage(mb);
      }
    }
    sampleMemory();
    const id = setInterval(sampleMemory, 10_000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Network type ───────────────────────────────────────────────────────────
  useEffect(() => {
    const nav = navigator as any;
    const conn = nav?.connection ?? nav?.mozConnection ?? nav?.webkitConnection;
    if (conn) {
      store.setNetworkType(conn.effectiveType ?? conn.type ?? "unknown");
      const handler = () => store.setNetworkType(conn.effectiveType ?? conn.type ?? "unknown");
      conn.addEventListener("change", handler);
      return () => conn.removeEventListener("change", handler);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Crash reporting ────────────────────────────────────────────────────────
  useEffect(() => {
    function handleError(event: ErrorEvent) {
      store.addCrashReport({
        message: event.message,
        stack: event.error?.stack,
        route: pathname,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
      });
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      store.addCrashReport({
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        route: pathname,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
      });
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Instruments a fetch call and records the API response time.
 * Usage: const data = await trackedFetch("/api/signals");
 */
export async function trackedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const store = usePerformanceStore.getState();
  const start = Date.now();
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const method = init?.method ?? "GET";

  try {
    const response = await fetch(input, init);
    store.addApiMetric({
      endpoint: url,
      method,
      durationMs: Date.now() - start,
      status: response.status,
      timestamp: Date.now(),
    });
    return response;
  } catch (err) {
    store.addApiMetric({
      endpoint: url,
      method,
      durationMs: Date.now() - start,
      status: 0,
      timestamp: Date.now(),
    });
    throw err;
  }
}
