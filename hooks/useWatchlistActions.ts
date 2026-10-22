"use client";

import { useCallback } from "react";
import { toast } from "@/lib/toast";
import { useWatchlistStore } from "@/store/useWatchlistStore";

export function useWatchlistActions() {
  const addWatchlist = useWatchlistStore((state) => state.addWatchlist);
  const removeWatchlist = useWatchlistStore((state) => state.removeWatchlist);
  const toggleWatchlist = useWatchlistStore((state) => state.toggleWatchlist);
  const hasWatchlist = useWatchlistStore((state) => state.hasWatchlist);

  const watchlistItem = useCallback(
    (symbol: string) => {
      addWatchlist(symbol);
      toast.success("Added to watchlist", {
        description: `${symbol} added to your watchlist.`,
        duration: 2500,
      });
    },
    [addWatchlist]
  );

  const unwatchlist = useCallback(
    (symbol: string, label: string) => {
      removeWatchlist(symbol);
      toast.info("Removed from watchlist", {
        description: `${label} was removed from your watchlist.`,
        duration: 2500,
        action: {
          label: "Undo",
          onClick: () => {
            toggleWatchlist(symbol);
          },
        },
      });
    },
    [removeWatchlist]
  );

  const toggleWatchlistWithUndo = useCallback(
    (symbol: string, label: string) => {
      if (hasWatchlist(symbol)) {
        return unwatchlist(symbol, label);
      }
      watchlistItem(symbol);
      return null;
    },
    [watchlistItem, unwatchlist, hasWatchlist]
  );

  return {
    addWatchlist: watchlistItem,
    removeWatchlist: unwatchlist,
    toggleWatchlist: (symbol: string, label: string) =>
      toggleWatchlistWithUndo(symbol, label),
    hasWatchlist,
  };
}