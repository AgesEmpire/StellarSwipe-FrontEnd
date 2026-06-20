"use client";

import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ToastProvider } from "@/components/ui/toast";
import { ReactQueryDevtoolsPanel } from "@/components/ReactQueryDevtoolsPanel";
import { initI18n } from "@/lib/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initI18n();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ToastProvider />
      <ReactQueryDevtoolsPanel />
    </QueryClientProvider>
  );
}
