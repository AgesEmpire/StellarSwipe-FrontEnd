/**
 * performanceMonitor.ts
 *
 * Lightweight performance monitoring service.
 * Collects page load times, API response times, crash reports,
 * memory usage, and network type data.
 *
 * All data is stored in-memory (usePerformanceStore) and can be
 * forwarded to an observability backend by replacing the `emit` function.
 *
 * Anonymous user consent is required before session recording begins.
 */

import { usePerformanceStore } from "@/store/usePerformanceStore";

// ── Emit ──────────────────────────────────────────────────────────────────────

function emit(event: string, data: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.debug(`[perf] ${event}`, data);
  }
  // Production hook: forward to your observability backend here.
  // e.g. sendToDatadog(event, data) / sendToNewRelic(event, data)
}

// ── API instrumentation ───────────────────────────────────────────────────────

/**
 * Wraps a fetch call and records the API response time.
 * Requires user consent to be given before recording session events.
 */
export async function monitoredFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const store = usePerformanceStore.getState();
  const start = performance.now();
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
      ? input.href
      : (input as Request).url;
  const method = init?.method ?? "GET";

  try {
    const response = await fetch(input, init);
    const durationMs = Math.round(performance.now() - start);
    const metric = { endpoint: url, method, durationMs, status: response.status, timestamp: Date.now() };
    store.addApiMetric(metric);
    emit("api.response", metric);
    return response;
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    const metric = { endpoint: url, method, durationMs, status: 0, timestamp: Date.now() };
    store.addApiMetric(metric);
    emit("api.error", { ...metric, error: String(err) });
    throw err;
  }
}

// ── Route timing ──────────────────────────────────────────────────────────────

let routeStartTime = performance.now();

export function markRouteStart() {
  routeStartTime = performance.now();
}

export function markRouteEnd(route: string) {
  const loadTimeMs = Math.round(performance.now() - routeStartTime);
  const metric = { route, loadTimeMs, timestamp: Date.now() };
  usePerformanceStore.getState().addRouteMetric(metric);
  emit("route.loaded", metric);
}

// ── Crash reporting ───────────────────────────────────────────────────────────

export function reportCrash(error: Error, route: string) {
  const report = {
    message: error.message,
    stack: error.stack,
    route,
    timestamp: Date.now(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
  };
  usePerformanceStore.getState().addCrashReport(report);
  emit("crash.reported", report);
}

// ── Memory sampling ───────────────────────────────────────────────────────────

export function sampleMemory() {
  const perf = performance as any;
  if (perf?.memory?.usedJSHeapSize) {
    const mb = Math.round(perf.memory.usedJSHeapSize / 1_048_576);
    usePerformanceStore.getState().setMemoryUsage(mb);
    emit("memory.sample", { mb });
  }
}

// ── Network type ──────────────────────────────────────────────────────────────

export function detectNetworkType(): string | null {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as any;
  const conn = nav?.connection ?? nav?.mozConnection ?? nav?.webkitConnection;
  return conn?.effectiveType ?? conn?.type ?? null;
}

// ── Session event recording ───────────────────────────────────────────────────

export function recordInteraction(
  type: "click" | "scroll" | "input" | "navigation" | "error",
  target: string | undefined,
  route: string,
  metadata?: Record<string, unknown>
) {
  const store = usePerformanceStore.getState();
  if (!store.consentGiven) return;
  store.addSessionEvent({ type, target, route, timestamp: Date.now(), metadata });
  emit("session.event", { type, target, route, metadata });
}

// ── Consent ───────────────────────────────────────────────────────────────────

export function grantConsent() {
  usePerformanceStore.getState().setConsent(true);
  emit("consent.granted", { timestamp: Date.now() });
}

export function revokeConsent() {
  usePerformanceStore.getState().setConsent(false);
  emit("consent.revoked", { timestamp: Date.now() });
}
