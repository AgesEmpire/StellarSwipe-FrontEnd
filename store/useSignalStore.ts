import { create } from "zustand";

export interface Signal {
  id: string;
  asset: string;
  signal: "BUY" | "SELL";
  description?: string;
  price: number;
}

interface SignalState {
  queue: Signal[];
  isPassing: boolean;
  passSignal: () => void;
  setQueue: (signals: Signal[]) => void;
  setIsPassing: (value: boolean) => void;
}

export const useSignalStore = create<SignalState>()((set, get) => ({
  queue: [],
  isPassing: false,

  setQueue: (signals) => set({ queue: signals }),

  setIsPassing: (value) => set({ isPassing: value }),

  passSignal: () => {
    const { isPassing, queue } = get();
    // Debounce guard — prevent multiple rapid clicks
    if (isPassing || queue.length === 0) return;
    set({ isPassing: true });
    // Remove the first card after the exit animation completes (~400ms)
    setTimeout(() => {
      set((state) => ({
        queue: state.queue.slice(1),
        isPassing: false,
      }));
    }, 400);
  },
}));
