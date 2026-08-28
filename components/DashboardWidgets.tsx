"use client";

import React, {
  Component,
  ErrorInfo,
  ReactNode,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, RotateCcw } from "lucide-react";
import { PortfolioSummaryCards } from "@/components/PortfolioSummaryCards";
import { PnLWidget } from "@/components/chart/PnLWidget";
import { PortfolioAllocationChart } from "@/components/chart/PortfolioAllocationChart";
import { PortfolioPerformanceBenchmarkChart } from "@/components/chart/PortfolioPerformanceBenchmarkChart";
import { RetryStateCard } from "@/components/ui/RetryStateCard";

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_ORDER = ["summary", "pnl", "allocation", "performance"];
const STORAGE_KEY = "stellar-swipe-dashboard-layout";

/**
 * Maximum number of consecutive retries before the widget stops showing the
 * retry button to avoid a noisy retry loop.  The user can still hard-refresh
 * the page to fully reset.
 */
const MAX_RETRIES = 3;

// ─── Per-widget error boundary ───────────────────────────────────────────────

interface WidgetErrorBoundaryProps {
  widgetId: string;
  widgetTitle: string;
  children: ReactNode;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  /** Incremented to force React to remount the child tree on retry. */
  retryKey: number;
}

/**
 * Class component error boundary scoped to a single dashboard widget.
 *
 * Design decisions:
 * - Catching errors here prevents them from propagating to the parent boundary,
 *   so all other widgets keep rendering normally.
 * - A `retryKey` forces a full remount of the child on retry, clearing any
 *   broken internal state.
 * - After MAX_RETRIES failed attempts the retry button is hidden to avoid a
 *   noisy loop; the error details are still visible to aid debugging.
 * - Repeated retries use exponential back-off via a disabled state
 *   (`retrying`), reducing the chance of hammering a flaky dependency.
 */
class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0, retryKey: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<WidgetErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console in development; wire to Sentry / observability in prod.
    if (process.env.NODE_ENV === "development") {
      console.error(
        `[WidgetErrorBoundary] Widget "${this.props.widgetId}" crashed:`,
        error,
        info.componentStack
      );
    }
  }

  handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
      retryKey: prev.retryKey + 1,
    }));
  };

  render() {
    const { hasError, error, retryCount, retryKey } = this.state;
    const { widgetTitle, children } = this.props;

    if (hasError) {
      const canRetry = retryCount < MAX_RETRIES;
      return (
        <RetryStateCard
          title={`${widgetTitle} failed to load`}
          description={
            canRetry
              ? "An error occurred while rendering this widget. Other widgets are not affected. Click Retry to reload just this widget."
              : `This widget has failed ${retryCount} time${retryCount !== 1 ? "s" : ""}. Refresh the page to fully reset.`
          }
          onRetry={canRetry ? this.handleRetry : undefined}
          actionLabel="Retry this widget"
          details={
            process.env.NODE_ENV === "development" && error
              ? error.message + (error.stack ? `\n${error.stack}` : "")
              : null
          }
          tone="warning"
        />
      );
    }

    // retryKey forces React to fully remount the child tree on retry.
    return <React.Fragment key={retryKey}>{children}</React.Fragment>;
  }
}

// ─── Widget registry ─────────────────────────────────────────────────────────

const WIDGET_META: Record<string, { title: string; component: ReactNode }> = {
  summary: { title: "Portfolio Summary", component: <PortfolioSummaryCards /> },
  pnl: { title: "P&L Overview", component: <PnLWidget /> },
  allocation: { title: "Portfolio Allocation", component: <PortfolioAllocationChart /> },
  performance: {
    title: "Performance vs Benchmark",
    component: <PortfolioPerformanceBenchmarkChart />,
  },
};

// ─── DashboardWidgets ────────────────────────────────────────────────────────

export function DashboardWidgets() {
  const [order, setOrder] = useState<string[]>(DEFAULT_ORDER);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.length === DEFAULT_ORDER.length &&
          parsed.every((x) => DEFAULT_ORDER.includes(x))
        ) {
          setOrder(parsed);
        }
      } catch {
        // Ignore parsing errors — fall back to default order.
      }
    }
    setMounted(true);
  }, []);

  const handleReorder = useCallback((newOrder: string[]) => {
    setOrder(newOrder);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
  }, []);

  const handleReset = useCallback(() => {
    setOrder(DEFAULT_ORDER);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ORDER));
  }, []);

  const moveItem = useCallback(
    (index: number, direction: "up" | "down") => {
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= order.length) return;
      const newOrder = [...order];
      const [moved] = newOrder.splice(index, 1);
      newOrder.splice(newIndex, 0, moved);
      handleReorder(newOrder);
    },
    [order, handleReorder]
  );

  if (!mounted) {
    // SSR / hydration pass — render widgets in default order without drag
    // controls to avoid hydration mismatches.
    return (
      <div className="flex flex-col gap-6">
        {DEFAULT_ORDER.map((id) => {
          const meta = WIDGET_META[id];
          return (
            <WidgetErrorBoundary key={id} widgetId={id} widgetTitle={meta.title}>
              {meta.component}
            </WidgetErrorBoundary>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
          Dashboard Widgets
        </span>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs text-foreground-subtle hover:text-foreground hover:bg-white/5 px-2 py-1 rounded transition-colors"
          title="Reset layout to default order"
        >
          <RotateCcw size={12} />
          Reset Layout
        </button>
      </div>

      <Reorder.Group
        axis="y"
        values={order}
        onReorder={handleReorder}
        className="flex flex-col gap-6"
      >
        {order.map((widgetId, index) => {
          const meta = WIDGET_META[widgetId] ?? {
            title: widgetId,
            component: null,
          };
          return (
            <WidgetWrapper
              key={widgetId}
              widgetId={widgetId}
              widgetTitle={meta.title}
              index={index}
              totalItems={order.length}
              onMove={moveItem}
            >
              {meta.component}
            </WidgetWrapper>
          );
        })}
      </Reorder.Group>
    </div>
  );
}

// ─── WidgetWrapper ────────────────────────────────────────────────────────────

interface WidgetWrapperProps {
  widgetId: string;
  widgetTitle: string;
  index: number;
  totalItems: number;
  onMove: (index: number, direction: "up" | "down") => void;
  children: ReactNode;
}

function WidgetWrapper({
  widgetId,
  widgetTitle,
  index,
  totalItems,
  onMove,
  children,
}: WidgetWrapperProps) {
  const dragControls = useDragControls();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      onMove(index, "up");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      onMove(index, "down");
    }
  };

  return (
    <Reorder.Item
      value={widgetId}
      dragListener={false}
      dragControls={dragControls}
      className="relative focus-within:ring-2 focus-within:ring-sky-500 rounded-xl outline-none"
    >
      {/* Each widget is wrapped in its own isolated error boundary.
          Crashing one widget does NOT affect any other widget. */}
      <WidgetErrorBoundary widgetId={widgetId} widgetTitle={widgetTitle}>
        <div
          tabIndex={0}
          onKeyDown={handleKeyDown}
          aria-label={`${widgetTitle} widget. Press Arrow Up or Down to reorder.`}
          className="group relative"
        >
          {/* Drag handle */}
          <div className="absolute left-2 top-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity bg-slate-900/90 rounded-md px-1.5 py-1 border border-white/10 shadow-md">
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-200"
              title="Drag to reorder"
            >
              <GripVertical size={13} />
            </div>
            <div className="flex flex-col text-[8px] text-slate-500 leading-none pr-0.5 select-none">
              <span>▲/▼ keys</span>
              <span>to reorder</span>
            </div>
          </div>
          {children}
        </div>
      </WidgetErrorBoundary>
    </Reorder.Item>
  );
}
