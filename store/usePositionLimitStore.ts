import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PositionLimitState {
  enabled: boolean;
  percentage: number; // e.g., 5 = 5%
  setEnabled: (enabled: boolean) => void;
  setPercentage: (percentage: number) => void;
  toggle: () => void;
}

export const usePositionLimitStore = create<PositionLimitState>()(
  persist(
    (set) => ({
      enabled: false,
      percentage: 5,
      setEnabled: (enabled) => set({ enabled }),
      setPercentage: (percentage) => set({ percentage }),
      toggle: () => set((state) => ({ enabled: !state.enabled })),
    }),
    { name: "position-limit-store" }
  )
);
