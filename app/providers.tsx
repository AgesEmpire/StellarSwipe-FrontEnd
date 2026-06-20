"use client";

import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/lib/queryClient";
import { ToastProvider } from "@/components/ui/toast";
import { initI18n } from "@/lib/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initI18n();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        {children}
        <ToastProvider />
        <ReactQueryDevtools initialIsOpen={false} />
      </MotionConfig>
    </QueryClientProvider>
  );
}
