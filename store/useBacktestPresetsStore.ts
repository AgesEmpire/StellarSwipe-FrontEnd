import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BacktestParams } from "@/lib/backtest";

export interface BacktestPreset {
  id: string;
  name: string;
  params: BacktestParams;
  createdAt: number;
}

interface BacktestPresetsState {
  presets: BacktestPreset[];
  savePreset: (name: string, params: BacktestParams) => void;
  deletePreset: (id: string) => void;
}

export const useBacktestPresetsStore = create<BacktestPresetsState>()(
  persist(
    (set) => ({
      presets: [],
      savePreset: (name, params) =>
        set((state) => ({
          presets: [
            ...state.presets,
            {
              id: `${name}-${state.presets.length}`,
              name,
              params,
              createdAt: Date.now(),
            },
          ],
        })),
      deletePreset: (id) =>
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== id),
        })),
    }),
    { name: "backtest-presets-store" }
  )
);
