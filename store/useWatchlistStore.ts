import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WatchlistState {
  watchlist: string[]; // array of asset symbols
  hasWatchlist: (symbol: string) => boolean;
  addWatchlist: (symbol: string) => void;
  removeWatchlist: (symbol: string) => void;
  toggleWatchlist: (symbol: string) => void;
  setWatchlist: (symbols: string[]) => void;
  clearWatchlist: () => void;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      watchlist: [],
      hasWatchlist: (symbol: string) => get().watchlist.includes(symbol),
      addWatchlist: (symbol: string) =>
        set((state) => ({
          watchlist: state.watchlist.includes(symbol)
            ? state.watchlist
            : [...state.watchlist, symbol],
        })),
      removeWatchlist: (symbol: string) =>
        set((state) => ({
          watchlist: state.watchlist.filter((watchlist) => watchlist !== symbol),
        })),
      toggleWatchlist: (symbol: string) =>
        set((state) => ({
          watchlist: state.watchlist.includes(symbol)
            ? state.watchlist.filter((watchlist) => watchlist !== symbol)
            : [...state.watchlist, symbol],
        })),
      setWatchlist: (symbols: string[]) => set({ watchlist: [...new Set(symbols)] }),
      clearWatchlist: () => set({ watchlist: [] }),
    }),
    { name: "watchlist-store" }
  )
);