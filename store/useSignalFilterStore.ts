import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  createPersistedState,
  type PersistHydrationState,
  withPersistedHydration,
} from "./persistHydration";

export type FilterDirection = "ALL" | "BUY" | "SELL";
export type FeedSortOrder = "latest" | "hot" | "relevant" | "confidence";

/** Human-readable labels for each sort order */
export const SORT_ORDER_LABELS: Record<FeedSortOrder, string> = {
  latest: "Newest",
  hot: "Best Performing",
  relevant: "Relevant",
  confidence: "Confidence",
};

interface SignalFilterState extends PersistHydrationState {
  direction: FilterDirection;
  asset: string;
  provider: string;
  bookmarkedOnly: boolean;
  sortOrder: FeedSortOrder;
  setDirection: (d: FilterDirection) => void;
  setAsset: (a: string) => void;
  setProvider: (p: string) => void;
  setBookmarkedOnly: (selected: boolean) => void;
  setSortOrder: (o: FeedSortOrder) => void;
  reset: () => void;
}

export const useSignalFilterStore = create<SignalFilterState>()(
  persist(
    (set) => ({
      ...createPersistedState<SignalFilterState>(set),
      direction: "ALL",
      asset: "",
      provider: "",
      bookmarkedOnly: false,
      sortOrder: "latest",
      setDirection: (direction) => set({ direction }),
      setAsset: (asset) => set({ asset }),
      setProvider: (provider) => set({ provider }),
      setBookmarkedOnly: (selected) => set({ bookmarkedOnly: selected }),
      setSortOrder: (sortOrder) => set({ sortOrder }),
      reset: () =>
        set({
          direction: "ALL",
          asset: "",
          provider: "",
          bookmarkedOnly: false,
          sortOrder: "latest",
        }),
    }),
    withPersistedHydration({ name: "signal-filter-store" })
  )
);
