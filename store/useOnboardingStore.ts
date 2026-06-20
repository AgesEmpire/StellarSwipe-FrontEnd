import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  createPersistedState,
  type PersistHydrationState,
  withPersistedHydration,
} from "./persistHydration";

interface OnboardingState extends PersistHydrationState {
  completed: boolean;
  dismissed: boolean;
  setCompleted: () => void;
  setDismissed: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...createPersistedState<OnboardingState>(set),
      completed: false,
      dismissed: false,
      setCompleted: () => set({ completed: true, dismissed: true }),
      setDismissed: () => set({ dismissed: true }),
      reset: () => set({ completed: false, dismissed: false }),
    }),
    withPersistedHydration({ name: "stellar-onboarding" })
  )
);
