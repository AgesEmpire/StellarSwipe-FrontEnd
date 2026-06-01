import { create } from "zustand";

export interface RouteMetric {
  route: string;
  loadTimeMs: number;
  timestamp: number;
}

export interface ApiMetric {
  endpoint: string;
  method: string;
  durationMs: number;
  status: number;
  timestamp: number;
}

export interface CrashReport {
  id: string;
  message: string;
  stack?: string;
  route: string;
  timestamp: number;
  userAgent: string;
  resolved: boolean;
}

export interface SessionEvent {
  type: "click" | "scroll" | "input" | "navigation" | "error";
  target?: string;
  route: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface PerformanceState {
  routeMetrics: RouteMetric[];
  apiMetrics: ApiMetric[];
  crashReports: CrashReport[];
  sessionEvents: SessionEvent[];
  memoryUsageMb: number | null;
  networkType: string | null;
  consentGiven: boolean;
  isOverlayVisible: boolean;
  addRouteMetric: (metric: RouteMetric) => void;
  addApiMetric: (metric: ApiMetric) => void;
  addCrashReport: (report: Omit<CrashReport, "id" | "resolved">) => void;
  addSessionEvent: (event: SessionEvent) => void;
  setMemoryUsage: (mb: number | null) => void;
  setNetworkType: (type: string | null) => void;
  setConsent: (given: boolean) => void;
  toggleOverlay: () => void;
  resolveCrash: (id: string) => void;
  clearMetrics: () => void;
}

const MAX_METRICS = 200;

export const usePerformanceStore = create<PerformanceState>()((set, get) => ({
  routeMetrics: [],
  apiMetrics: [],
  crashReports: [],
  sessionEvents: [],
  memoryUsageMb: null,
  networkType: null,
  consentGiven: false,
  isOverlayVisible: false,

  addRouteMetric: (metric) =>
    set((s) => ({
      routeMetrics: [...s.routeMetrics.slice(-MAX_METRICS + 1), metric],
    })),

  addApiMetric: (metric) =>
    set((s) => ({
      apiMetrics: [...s.apiMetrics.slice(-MAX_METRICS + 1), metric],
    })),

  addCrashReport: (report) =>
    set((s) => ({
      crashReports: [
        ...s.crashReports,
        { ...report, id: `crash-${Date.now()}`, resolved: false },
      ],
    })),

  addSessionEvent: (event) => {
    if (!get().consentGiven) return;
    set((s) => ({
      sessionEvents: [...s.sessionEvents.slice(-MAX_METRICS + 1), event],
    }));
  },

  setMemoryUsage: (mb) => set({ memoryUsageMb: mb }),
  setNetworkType: (type) => set({ networkType: type }),
  setConsent: (given) => set({ consentGiven: given }),
  toggleOverlay: () => set((s) => ({ isOverlayVisible: !s.isOverlayVisible })),
  resolveCrash: (id) =>
    set((s) => ({
      crashReports: s.crashReports.map((c) =>
        c.id === id ? { ...c, resolved: true } : c
      ),
    })),
  clearMetrics: () =>
    set({ routeMetrics: [], apiMetrics: [], crashReports: [], sessionEvents: [] }),
}));
