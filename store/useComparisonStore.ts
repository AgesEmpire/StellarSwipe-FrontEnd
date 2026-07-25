import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Signal } from "@/lib/api-types.generated";

export const MAX_SIGNALS = 3;
/** Alias used by the ComparisonTray component and its tests. */
export const MAX_COMPARISON = MAX_SIGNALS;

interface ComparisonState {
  signals: Signal[];
  hiddenMetrics: string[];
  limitReached: boolean;
  addSignal: (signal: Signal) => boolean;
  removeSignal: (id: string) => void;
  clearSignals: () => void;
  /** Alias for clearSignals — used by ComparisonTray. */
  clearAll: () => void;
  toggleMetric: (key: string) => void;
  isSelected: (id: string) => boolean;
  canAdd: () => boolean;
  dismissLimitMessage: () => void;
}

export const useComparisonStore = create<ComparisonState>()(
  persist(
    (set, get) => ({
      signals: [],
      hiddenMetrics: [],
      limitReached: false,

      addSignal: (signal) => {
        const { signals } = get();
        if (signals.length >= MAX_SIGNALS) {
          set({ limitReached: true });
          return false;
        }
        if (signals.find((s) => s.id === signal.id)) return false;
        set({ signals: [...signals, signal], limitReached: false });
        return true;
      },

      removeSignal: (id) =>
        set((state) => ({
          signals: state.signals.filter((s) => s.id !== id),
          // Clear the limit banner whenever a slot opens up
          limitReached: false,
        })),

      clearSignals: () => set({ signals: [], limitReached: false }),
      clearAll: () => set({ signals: [], limitReached: false }),

      toggleMetric: (key) =>
        set((state) => ({
          hiddenMetrics: state.hiddenMetrics.includes(key)
            ? state.hiddenMetrics.filter((k) => k !== key)
            : [...state.hiddenMetrics, key],
        })),

      isSelected: (id) => get().signals.some((s) => s.id === id),
      canAdd: () => get().signals.length < MAX_SIGNALS,
      dismissLimitMessage: () => set({ limitReached: false }),
    }),
    { name: "signal-comparison" }
  )
);
