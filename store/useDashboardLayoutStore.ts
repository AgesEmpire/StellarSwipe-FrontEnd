import { create } from "zustand";
import { persist } from "zustand/middleware";

export const DEFAULT_WIDGET_ORDER = [
  "portfolio-summary",
  "portfolio-allocation",
  "pnl-overview",
  "transaction-activity",
] as const;

export type DashboardWidgetId = (typeof DEFAULT_WIDGET_ORDER)[number];

interface DashboardLayoutState {
  order: DashboardWidgetId[];
  moveBefore: (id: DashboardWidgetId) => void;
  moveAfter: (id: DashboardWidgetId) => void;
  moveToStart: (id: DashboardWidgetId) => void;
  moveToEnd: (id: DashboardWidgetId) => void;
}

function swap<T>(arr: T[], i: number, j: number): T[] {
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export const useDashboardLayoutStore = create<DashboardLayoutState>()(
  persist(
    (set) => ({
      order: [...DEFAULT_WIDGET_ORDER],
      moveBefore: (id) =>
        set((state) => {
          const i = state.order.indexOf(id);
          if (i <= 0) return state;
          return { order: swap(state.order, i, i - 1) };
        }),
      moveAfter: (id) =>
        set((state) => {
          const i = state.order.indexOf(id);
          if (i === -1 || i >= state.order.length - 1) return state;
          return { order: swap(state.order, i, i + 1) };
        }),
      moveToStart: (id) =>
        set((state) => {
          const i = state.order.indexOf(id);
          if (i <= 0) return state;
          const next = [...state.order];
          next.splice(i, 1);
          next.unshift(id);
          return { order: next };
        }),
      moveToEnd: (id) =>
        set((state) => {
          const i = state.order.indexOf(id);
          if (i === -1 || i === state.order.length - 1) return state;
          const next = [...state.order];
          next.splice(i, 1);
          next.push(id);
          return { order: next };
        }),
    }),
    { name: "dashboard-layout-store" }
  )
);
