import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  createPersistedState,
  type PersistHydrationState,
  withPersistedHydration,
} from "./persistHydration";

interface BookmarkState extends PersistHydrationState {
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
  clearBookmarks: () => void;
}

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set) => ({
      ...createPersistedState<BookmarkState>(set),
      bookmarks: [],
      toggleBookmark: (id: string) =>
        set((state) => ({
          bookmarks: state.bookmarks.includes(id)
            ? state.bookmarks.filter((bookmark) => bookmark !== id)
            : [...state.bookmarks, id],
        })),
      clearBookmarks: () => set({ bookmarks: [] }),
    }),
    withPersistedHydration({ name: "signal-bookmarks" })
  )
);
