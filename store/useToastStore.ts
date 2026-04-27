"use client";

import { create } from "zustand";

export type ToastTone = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  duration: number;
}

interface ToastState {
  toasts: ToastMessage[];
  enqueue: (toast: Omit<ToastMessage, "id">) => string;
  dismiss: (id: string) => void;
}

const DEFAULT_TOAST_DURATION = 5000;

function generateToastId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `toast_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  enqueue: ({ title, description, tone, duration = DEFAULT_TOAST_DURATION }) => {
    const id = generateToastId();
    set((state) => ({
      toasts: [...state.toasts, { id, title, description, tone, duration }],
    }));

    if (typeof window !== "undefined" && duration > 0) {
      window.setTimeout(() => get().dismiss(id), duration);
    }

    return id;
  },
  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));
