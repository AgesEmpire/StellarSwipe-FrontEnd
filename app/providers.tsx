"use client";

import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/lib/queryClient";
import { ToastProvider } from "@/components/ui/toast";
import { initI18n } from "@/lib/i18n";
import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";

function PerformanceMonitorInit() {
  usePerformanceMonitor();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initI18n();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <PerformanceMonitorInit />
      {children}
      <ToastProvider />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
