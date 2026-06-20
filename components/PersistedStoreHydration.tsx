"use client";

import { useEffect } from "react";
import { useBookmarkStore } from "@/store/useBookmarkStore";
import { useComparisonStore } from "@/store/useComparisonStore";
import { useDemoModeStore } from "@/store/useDemoModeStore";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { usePositionLimitStore } from "@/store/usePositionLimitStore";
import { useRecommendationStore } from "@/store/useRecommendationStore";
import { useSignalFilterStore } from "@/store/useSignalFilterStore";
import { useThemeStore } from "@/store/useThemeStore";
import { useWalletStore } from "@/store/useWalletStore";
import { useWebhookStore } from "@/store/useWebhookStore";

type RehydratableStore = {
  persist: {
    rehydrate: () => Promise<void> | void;
  };
};

const persistedStores = [
  useBookmarkStore,
  useComparisonStore,
  useDemoModeStore,
  useOnboardingStore,
  usePortfolioStore,
  usePositionLimitStore,
  useRecommendationStore,
  useSignalFilterStore,
  useThemeStore,
  useWalletStore,
  useWebhookStore,
] as RehydratableStore[];

export function PersistedStoreHydration() {
  useEffect(() => {
    for (const store of persistedStores) {
      void store.persist.rehydrate();
    }
  }, []);

  return null;
}
