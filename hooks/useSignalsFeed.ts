"use client";

import { useQuery } from "@tanstack/react-query";
import { useDemoModeStore } from "@/store/useDemoModeStore";
import { buildSignalPage, Signal, SignalFeedPage } from "@/lib/signals";
import { NetworkError, ServerError } from "@/lib/api";

interface UseSignalsFeedOptions {
  pageSize?: number;
}

export function useSignalsFeed({ pageSize = 10 }: UseSignalsFeedOptions = {}) {
  const { isDemoMode } = useDemoModeStore();

  const fetchLiveSignals = async (): Promise<Signal[]> => {
    let response: Response;

    try {
      response = await fetch(`/api/signals?page=1&pageSize=${pageSize}`, {
        headers: {
          "Cache-Control": "no-cache",
        },
      });
    } catch (err) {
      // Network error
      const networkError = new NetworkError();
      throw networkError;
    }

    if (!response.ok) {
      // Server error
      const errorData = await response.text();
      const serverError = new ServerError(response.status);
      // Enhance error message with status
      serverError.message = `Server error (${response.status}): ${
        errorData || "Unable to load signals"
      }. Please try again later.`;
      throw serverError;
    }

    try {
      const page: SignalFeedPage = await response.json();
      return page.items;
    } catch (err) {
      // JSON parsing error
      const parseError = new Error(
        "Failed to parse signal data. This might indicate a service issue."
      );
      throw parseError;
    }
  };

  const fetchDemoSignals = async (): Promise<Signal[]> => {
    const page = buildSignalPage(1, pageSize);
    return page.items;
  };

  const { data: signals, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["signals", isDemoMode ? "demo" : "live", pageSize],
    queryFn: isDemoMode ? fetchDemoSignals : fetchLiveSignals,
    staleTime: 60000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 10000),
  });

  return {
    signals: signals || [],
    isLoading,
    error,
    refetch,
    isRefetching,
    isDemoMode,
  };
}
