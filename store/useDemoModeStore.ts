import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  createPersistedState,
  type PersistHydrationState,
  withPersistedHydration,
} from "./persistHydration";

export interface DemoState extends PersistHydrationState {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  setDemoMode: (enabled: boolean) => void;
}

export const useDemoModeStore = create<DemoState>()(
  persist(
    (set) => ({
      ...createPersistedState<DemoState>(set),
      isDemoMode: false,
      toggleDemoMode: () => set((state) => ({ isDemoMode: !state.isDemoMode })),
      setDemoMode: (enabled) => set({ isDemoMode: enabled }),
    }),
    withPersistedHydration({ name: "demo-mode-store" })
  )
);
