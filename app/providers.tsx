"use client";

import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/lib/queryClient";
import { ToastProvider } from "@/components/ui/toast";
import { initI18n } from "@/lib/i18n";
import { PerformanceMonitoringProvider } from "@/components/performance/PerformanceMonitoringProvider";
import { useCrossTabSync } from "@/hooks/useCrossTabSync";
import { useServiceWorker } from "@/hooks/useServiceWorker";

export function Providers({ children }: { children: React.ReactNode }) {
  useCrossTabSync();
  useServiceWorker();

  useEffect(() => {
    initI18n();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <PerformanceMonitoringProvider>
        {children}
      </PerformanceMonitoringProvider>
      <ToastProvider />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
