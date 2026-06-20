import type { PersistOptions } from "zustand/middleware";

export interface PersistHydrationState {
  isHydrated: boolean;
  setHydrated: (isHydrated: boolean) => void;
}

type HydrationSetter<T extends PersistHydrationState> = (
  partial: Partial<T>
) => void;

export function createPersistedState<T extends PersistHydrationState>(
  set: HydrationSetter<T>
): PersistHydrationState {
  return {
    isHydrated: false,
    setHydrated: (isHydrated) => set({ isHydrated } as Partial<T>),
  };
}

export function withPersistedHydration<T extends PersistHydrationState>(
  options: PersistOptions<T>
): PersistOptions<T> {
  const onRehydrateStorage = options.onRehydrateStorage;
  const partialize = options.partialize;

  return {
    ...options,
    skipHydration: true,
    partialize: (state) => {
      const persistedState = partialize ? partialize(state) : state;
      const { isHydrated: _isHydrated, setHydrated: _setHydrated, ...rest } =
        persistedState as PersistHydrationState & Record<string, unknown>;

      return rest as unknown as T;
    },
    onRehydrateStorage: (state) => {
      state.setHydrated(false);
      const afterRehydrate = onRehydrateStorage?.(state);

      return (rehydratedState, error) => {
        afterRehydrate?.(rehydratedState, error);
        (rehydratedState ?? state).setHydrated(!error);
      };
    },
  };
}
