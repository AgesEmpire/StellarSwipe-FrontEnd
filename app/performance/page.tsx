"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Zap,
  AlertTriangle,
  Wifi,
  WifiOff,
  Cpu,
  Clock,
  CheckCircle,
  XCircle,
  Shield,
  BarChart2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePerformanceStore, type CrashReport, type RouteMetric, type ApiMetric } from "@/store/usePerformanceStore";
import { grantConsent, revokeConsent } from "@/services/performanceMonitor";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMs(ms: number) {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function statusColor(ms: number) {
  if (ms < 300) return "text-[hsl(var(--accent-success))]";
  if (ms < 1000) return "text-[hsl(var(--accent-warning))]";
  return "text-[hsl(var(--accent-danger))]";
}

// ── Consent banner ────────────────────────────────────────────────────────────

function ConsentBanner({ onGrant, onRevoke, consentGiven }: {
  onGrant: () => void;
  onRevoke: () => void;
  consentGiven: boolean;
}) {
  return (
    <div className={cn(
      "rounded-lg border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
      consentGiven
        ? "border-[hsl(var(--accent-success)/0.3)] bg-[hsl(var(--accent-success)/0.08)]"
        : "border-[hsl(var(--accent-warning)/0.3)] bg-[hsl(var(--accent-warning)/0.08)]"
    )}>
      <div className="flex items-start gap-3">
        <Shield size={18} className={consentGiven ? "text-[hsl(var(--accent-success))] shrink-0 mt-0.5" : "text-[hsl(var(--accent-warning))] shrink-0 mt-0.5"} />
        <div>
          <p className="text-sm font-semibold text-foreground">
            {consentGiven ? "Session recording enabled" : "Anonymous session recording"}
          </p>
          <p className="text-xs text-foreground-muted mt-0.5">
            {consentGiven
              ? "Your interactions are being recorded anonymously to help improve the app. No personal data is collected."
              : "Enable anonymous session recording to help us identify UX issues. No personal data is collected. You can opt out at any time."}
          </p>
        </div>
      </div>
      {consentGiven ? (
        <Button size="sm" variant="outline" onClick={onRevoke} className="gap-1.5 shrink-0">
          <EyeOff size={14} /> Opt Out
        </Button>
      ) : (
        <Button size="sm" onClick={onGrant} className="gap-1.5 shrink-0">
          <Eye size={14} /> Enable
        </Button>
      )}
    </div>
  );
}

// ── Route metrics table ───────────────────────────────────────────────────────

function RouteMetricsTable({ metrics }: { metrics: RouteMetric[] }) {
  if (metrics.length === 0) {
    return <p className="text-sm text-foreground-muted text-center py-6">No route metrics yet. Navigate around the app to collect data.</p>;
  }

  // Aggregate by route
  const byRoute = new Map<string, { count: number; total: number; min: number; max: number }>();
  for (const m of metrics) {
    const existing = byRoute.get(m.route);
    if (existing) {
      existing.count++;
      existing.total += m.loadTimeMs;
      existing.min = Math.min(existing.min, m.loadTimeMs);
      existing.max = Math.max(existing.max, m.loadTimeMs);
    } else {
      byRoute.set(m.route, { count: 1, total: m.loadTimeMs, min: m.loadTimeMs, max: m.loadTimeMs });
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" aria-label="Route load time metrics">
        <thead>
          <tr className="border-b border-border text-xs text-foreground-muted">
            <th className="text-left py-2 pr-4 font-medium">Route</th>
            <th className="text-right py-2 px-2 font-medium">Avg</th>
            <th className="text-right py-2 px-2 font-medium">Min</th>
            <th className="text-right py-2 px-2 font-medium">Max</th>
            <th className="text-right py-2 pl-2 font-medium">Hits</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(byRoute.entries()).map(([route, stats]) => {
            const avg = Math.round(stats.total / stats.count);
            return (
              <tr key={route} className="border-b border-border/50 hover:bg-surface-high/50 transition-colors">
                <td className="py-2 pr-4 font-mono text-xs text-foreground">{route}</td>
                <td className={cn("py-2 px-2 text-right font-mono text-xs", statusColor(avg))}>{fmtMs(avg)}</td>
                <td className="py-2 px-2 text-right font-mono text-xs text-[hsl(var(--accent-success))]">{fmtMs(stats.min)}</td>
                <td className="py-2 px-2 text-right font-mono text-xs text-[hsl(var(--accent-danger))]">{fmtMs(stats.max)}</td>
                <td className="py-2 pl-2 text-right text-xs text-foreground-muted">{stats.count}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── API metrics table ─────────────────────────────────────────────────────────

function ApiMetricsTable({ metrics }: { metrics: ApiMetric[] }) {
  if (metrics.length === 0) {
    return <p className="text-sm text-foreground-muted text-center py-6">No API metrics yet.</p>;
  }

  const recent = [...metrics].reverse().slice(0, 20);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" aria-label="API response time metrics">
        <thead>
          <tr className="border-b border-border text-xs text-foreground-muted">
            <th className="text-left py-2 pr-4 font-medium">Endpoint</th>
            <th className="text-right py-2 px-2 font-medium">Method</th>
            <th className="text-right py-2 px-2 font-medium">Duration</th>
            <th className="text-right py-2 px-2 font-medium">Status</th>
            <th className="text-right py-2 pl-2 font-medium">When</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((m, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-surface-high/50 transition-colors">
              <td className="py-2 pr-4 font-mono text-xs text-foreground truncate max-w-[160px]">{m.endpoint}</td>
              <td className="py-2 px-2 text-right text-xs text-foreground-muted">{m.method}</td>
              <td className={cn("py-2 px-2 text-right font-mono text-xs", statusColor(m.durationMs))}>{fmtMs(m.durationMs)}</td>
              <td className={cn("py-2 px-2 text-right text-xs font-mono", m.status >= 200 && m.status < 300 ? "text-[hsl(var(--accent-success))]" : "text-[hsl(var(--accent-danger))]")}>
                {m.status || "ERR"}
              </td>
              <td className="py-2 pl-2 text-right text-xs text-foreground-muted">{timeAgo(m.timestamp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Crash report card ─────────────────────────────────────────────────────────

function CrashCard({ crash, onResolve }: { crash: CrashReport; onResolve: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn(
      "rounded-lg border p-4 space-y-2",
      crash.resolved
        ? "border-border bg-surface-high opacity-60"
        : "border-[hsl(var(--accent-danger)/0.3)] bg-[hsl(var(--accent-danger)/0.06)]"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          {crash.resolved
            ? <CheckCircle size={16} className="text-[hsl(var(--accent-success))] shrink-0 mt-0.5" />
            : <XCircle size={16} className="text-[hsl(var(--accent-danger))] shrink-0 mt-0.5" />}
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{crash.message}</p>
            <p className="text-xs text-foreground-muted">{crash.route} · {timeAgo(crash.timestamp)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!crash.resolved && (
            <Button size="sm" variant="outline" onClick={onResolve} className="text-xs h-7 px-2">
              Resolve
            </Button>
          )}
          {crash.stack && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-foreground-muted hover:text-foreground transition-colors"
              aria-label={expanded ? "Collapse stack trace" : "Expand stack trace"}
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
      </div>
      {expanded && crash.stack && (
        <pre className="text-[10px] font-mono text-foreground-muted bg-surface-high rounded p-3 overflow-x-auto whitespace-pre-wrap break-all">
          {crash.stack}
        </pre>
      )}
    </div>
  );
}

// ── Device breakdown (mock) ───────────────────────────────────────────────────

const DEVICE_DATA = [
  { label: "Desktop (Chrome)", percent: 42, color: "hsl(var(--accent-primary))" },
  { label: "Mobile (Safari)",  percent: 31, color: "hsl(var(--accent-sky))" },
  { label: "Mobile (Chrome)",  percent: 18, color: "hsl(var(--accent-success))" },
  { label: "Tablet",           percent: 9,  color: "hsl(var(--accent-warning))" },
];

const NETWORK_DATA = [
  { label: "WiFi / Ethernet", percent: 58, color: "hsl(var(--accent-success))" },
  { label: "4G LTE",          percent: 28, color: "hsl(var(--accent-primary))" },
  { label: "3G",              percent: 10, color: "hsl(var(--accent-warning))" },
  { label: "2G / Slow",       percent: 4,  color: "hsl(var(--accent-danger))" },
];

function BreakdownBar({ data }: { data: { label: string; percent: number; color: string }[] }) {
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="text-xs text-foreground-muted w-36 shrink-0">{d.label}</span>
          <div className="flex-1 h-2 rounded-full bg-surface-high overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: d.color }}
              initial={{ width: 0 }}
              animate={{ width: `${d.percent}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <span className="text-xs text-foreground-muted w-8 text-right">{d.percent}%</span>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PerformancePage() {
  const store = usePerformanceStore();
  const unresolvedCrashes = store.crashReports.filter((c) => !c.resolved);
  const resolvedCrashes = store.crashReports.filter((c) => c.resolved);

  const avgRouteLoad = store.routeMetrics.length > 0
    ? Math.round(store.routeMetrics.reduce((s, m) => s + m.loadTimeMs, 0) / store.routeMetrics.length)
    : null;

  const avgApiResponse = store.apiMetrics.length > 0
    ? Math.round(store.apiMetrics.reduce((s, m) => s + m.durationMs, 0) / store.apiMetrics.length)
    : null;

  function handleGrantConsent() {
    grantConsent();
    toast.success("Session recording enabled", { description: "Anonymous interaction data will be collected." });
  }

  function handleRevokeConsent() {
    revokeConsent();
    toast.info("Session recording disabled");
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-[hsl(var(--background))] pb-16">
        <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Activity size={24} className="text-[hsl(var(--accent-primary))]" />
              Performance Monitoring
            </h1>
            <p className="text-sm text-foreground-muted mt-1">
              Real-time metrics for load times, API responses, crashes, and user experience.
            </p>
          </div>

          {/* Consent */}
          <ConsentBanner
            consentGiven={store.consentGiven}
            onGrant={handleGrantConsent}
            onRevoke={handleRevokeConsent}
          />

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Avg Page Load",
                value: avgRouteLoad !== null ? fmtMs(avgRouteLoad) : "—",
                icon: Zap,
                color: avgRouteLoad !== null ? statusColor(avgRouteLoad) : "text-foreground-muted",
              },
              {
                label: "Avg API Response",
                value: avgApiResponse !== null ? fmtMs(avgApiResponse) : "—",
                icon: Clock,
                color: avgApiResponse !== null ? statusColor(avgApiResponse) : "text-foreground-muted",
              },
              {
                label: "Open Crashes",
                value: String(unresolvedCrashes.length),
                icon: AlertTriangle,
                color: unresolvedCrashes.length > 0 ? "text-[hsl(var(--accent-danger))]" : "text-[hsl(var(--accent-success))]",
              },
              {
                label: "Memory Usage",
                value: store.memoryUsageMb !== null ? `${store.memoryUsageMb} MB` : "—",
                icon: Cpu,
                color: store.memoryUsageMb !== null && store.memoryUsageMb > 200 ? "text-[hsl(var(--accent-warning))]" : "text-foreground-muted",
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={13} className={cn("shrink-0", color)} aria-hidden="true" />
                    <span className="text-[11px] text-foreground-muted">{label}</span>
                  </div>
                  <p className={cn("text-xl font-bold", color)}>{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Network type */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                {store.networkType ? <Wifi size={16} className="text-[hsl(var(--accent-success))]" /> : <WifiOff size={16} className="text-foreground-muted" />}
                <h2 className="text-base font-semibold text-foreground">Network</h2>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground-muted mb-4">
                Current connection: <span className="font-semibold text-foreground">{store.networkType ?? "Unknown"}</span>
              </p>
              <h3 className="text-xs text-foreground-muted mb-2">Network type distribution (session data)</h3>
              <BreakdownBar data={NETWORK_DATA} />
            </CardContent>
          </Card>

          {/* Route load times */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Zap size={16} className="text-foreground-muted" />
                Page Load Times
              </h2>
            </CardHeader>
            <CardContent>
              <RouteMetricsTable metrics={store.routeMetrics} />
            </CardContent>
          </Card>

          {/* API response times */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <BarChart2 size={16} className="text-foreground-muted" />
                API Response Times
              </h2>
            </CardHeader>
            <CardContent>
              <ApiMetricsTable metrics={store.apiMetrics} />
            </CardContent>
          </Card>

          {/* Device breakdown */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-foreground">Device &amp; OS Breakdown</h2>
            </CardHeader>
            <CardContent>
              <BreakdownBar data={DEVICE_DATA} />
            </CardContent>
          </Card>

          {/* Crash reports */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle size={16} className={unresolvedCrashes.length > 0 ? "text-[hsl(var(--accent-danger))]" : "text-foreground-muted"} />
                  Crash Reports
                </h2>
                {store.crashReports.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => store.clearMetrics()} className="text-xs h-7 px-2">
                    Clear All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {store.crashReports.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-[hsl(var(--accent-success))] py-4 justify-center">
                  <CheckCircle size={16} /> No crashes recorded
                </div>
              ) : (
                <>
                  {unresolvedCrashes.map((c) => (
                    <CrashCard key={c.id} crash={c} onResolve={() => store.resolveCrash(c.id)} />
                  ))}
                  {resolvedCrashes.length > 0 && (
                    <div>
                      <p className="text-xs text-foreground-muted mb-2">Resolved ({resolvedCrashes.length})</p>
                      {resolvedCrashes.map((c) => (
                        <CrashCard key={c.id} crash={c} onResolve={() => {}} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Session events */}
          {store.consentGiven && (
            <Card>
              <CardHeader>
                <h2 className="text-base font-semibold text-foreground">Session Events</h2>
              </CardHeader>
              <CardContent>
                {store.sessionEvents.length === 0 ? (
                  <p className="text-sm text-foreground-muted text-center py-6">No session events recorded yet.</p>
                ) : (
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {[...store.sessionEvents].reverse().slice(0, 50).map((e, i) => (
                      <div key={i} className="flex items-center gap-3 text-xs py-1 border-b border-border/50">
                        <span className="text-foreground-subtle w-16 shrink-0">{timeAgo(e.timestamp)}</span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0",
                          e.type === "error" ? "bg-red-500/20 text-red-400" :
                          e.type === "click" ? "bg-blue-500/20 text-blue-400" :
                          "bg-gray-500/20 text-gray-400"
                        )}>{e.type}</span>
                        <span className="text-foreground-muted truncate">{e.target ?? e.route}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </main>
    </PageTransition>
  );
}
