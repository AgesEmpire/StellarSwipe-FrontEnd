import { useToastStore } from "@/store/useToastStore";
import type { ToastTone } from "@/store/useToastStore";

export interface ToastOptions {
  description?: string;
  duration?: number;
}

function showToast(tone: ToastTone, title: string, options?: ToastOptions) {
  return useToastStore.getState().enqueue({
    tone,
    title,
    description: options?.description,
    duration: options?.duration ?? 5000,
  });
}

export const toast = {
  success: (title: string, options?: ToastOptions) =>
    showToast("success", title, options),
  error: (title: string, options?: ToastOptions) =>
    showToast("error", title, options),
  info: (title: string, options?: ToastOptions) =>
    showToast("info", title, options),
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
};

export function useToast() {
  const enqueue = useToastStore((state) => state.enqueue);
  const dismiss = useToastStore((state) => state.dismiss);

  return {
    success: (title: string, options?: ToastOptions) => enqueue({ tone: "success", title, description: options?.description, duration: options?.duration ?? 5000 }),
    error: (title: string, options?: ToastOptions) => enqueue({ tone: "error", title, description: options?.description, duration: options?.duration ?? 5000 }),
    info: (title: string, options?: ToastOptions) => enqueue({ tone: "info", title, description: options?.description, duration: options?.duration ?? 5000 }),
    dismiss,
  };
}
