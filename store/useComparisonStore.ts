import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Signal } from "@/lib/api";
import {
  createPersistedState,
  type PersistHydrationState,
  withPersistedHydration,
} from "./persistHydration";

const MAX_SIGNALS = 3;

interface ComparisonState extends PersistHydrationState {
  signals: Signal[];
  hiddenMetrics: string[];
  addSignal: (signal: Signal) => boolean;
  removeSignal: (id: string) => void;
  clearSignals: () => void;
  toggleMetric: (key: string) => void;
  isSelected: (id: string) => boolean;
  canAdd: () => boolean;
}

export const useComparisonStore = create<ComparisonState>()(
  persist(
    (set, get) => ({
      ...createPersistedState<ComparisonState>(set),
      signals: [],
      hiddenMetrics: [],

      addSignal: (signal) => {
        const { signals } = get();
        if (signals.length >= MAX_SIGNALS) return false;
        if (signals.find((s) => s.id === signal.id)) return false;
        set({ signals: [...signals, signal] });
        return true;
      },

      removeSignal: (id) =>
        set((state) => ({ signals: state.signals.filter((s) => s.id !== id) })),

      clearSignals: () => set({ signals: [] }),

      toggleMetric: (key) =>
        set((state) => ({
          hiddenMetrics: state.hiddenMetrics.includes(key)
            ? state.hiddenMetrics.filter((k) => k !== key)
            : [...state.hiddenMetrics, key],
        })),

      isSelected: (id) => get().signals.some((s) => s.id === id),
      canAdd: () => get().signals.length < MAX_SIGNALS,
    }),
    withPersistedHydration({ name: "signal-comparison" })
  )
);
