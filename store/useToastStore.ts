"use client";

import { create } from "zustand";

export type ToastTone = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  link?: { href: string; label: string };
  action?: ToastAction;
  tone: ToastTone;
  duration: number;
}

interface ToastState {
  toasts: ToastMessage[];
  enqueue: (toast: Omit<ToastMessage, "id">) => string;
  dismiss: (id: string) => void;
}

export const DEFAULT_TOAST_DURATION = 5000;

// Caps the visible stack so toasts always lay out vertically without
// overrunning the viewport; oldest toast is evicted once the cap is hit.
export const MAX_VISIBLE_TOASTS = 4;

function generateToastId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `toast_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  enqueue: ({
    title,
    description,
    link,
    action,
    tone,
    duration = DEFAULT_TOAST_DURATION,
  }) => {
    const id = generateToastId();
    set((state) => ({
      toasts: [
        ...state.toasts,
        { id, title, description, link, action, tone, duration },
      ].slice(-MAX_VISIBLE_TOASTS),
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
