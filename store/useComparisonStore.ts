import { create } from "zustand";

export const MAX_COMPARISON = 4;

export interface Signal {
  id: string;
  name: string;
}

interface ComparisonState {
  signals: Signal[];
  limitReached: boolean;
  addSignal: (signal: Signal) => boolean;
  removeSignal: (id: string) => void;
  clearAll: () => void;
  dismissLimitMessage: () => void;
}

export const useComparisonStore = create<ComparisonState>((set, get) => ({
  signals: [],
  limitReached: false,

  addSignal: (signal: Signal) => {
    const { signals } = get();

    // Already in tray – no-op, return true (success)
    if (signals.some((s) => s.id === signal.id)) {
      return true;
    }

    if (signals.length >= MAX_COMPARISON) {
      set({ limitReached: true });
      return false;
    }

    set({ signals: [...signals, signal], limitReached: false });
    return true;
  },

  removeSignal: (id: string) => {
    set((state) => ({
      signals: state.signals.filter((s) => s.id !== id),
      // Removing an item clears the limit banner so the user can add again
      limitReached: false,
    }));
  },

  clearAll: () => set({ signals: [], limitReached: false }),

  dismissLimitMessage: () => set({ limitReached: false }),
}));
