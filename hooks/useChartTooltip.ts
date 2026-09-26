"use client";

import { useState, useCallback, useRef, useId } from "react";

export interface ChartTooltipPoint {
  index: number;
  value: number | string;
  label?: string;
}

export interface UseChartTooltipReturn {
  /** Index of the currently active data point, or null if none */
  activeIndex: number | null;
  /** Whether the tooltip is currently visible */
  isVisible: boolean;
  /** Accessible description of the current data point for screen readers */
  activeDescription: string;
  /** Unique id for aria-describedby relationships */
  tooltipId: string;
  /** Call on keyboard ArrowLeft/ArrowRight to navigate between points */
  handleKeyDown: (e: React.KeyboardEvent, dataLength: number) => void;
  /** Call on pointer/touch enter of a segment/point */
  showAt: (index: number) => void;
  /** Call on pointer/touch leave or Escape key */
  hide: () => void;
  /** Props to spread on the container element */
  containerProps: {
    tabIndex: number;
    role: "img";
    "aria-label": string;
    "aria-describedby": string;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onBlur: () => void;
  };
}

interface UseChartTooltipOptions {
  /** Accessible label for the chart container */
  ariaLabel: string;
  /** Produce a human-readable description from the active point */
  describePoint: (index: number) => string;
  /** Total number of data points */
  dataLength: number;
}

/**
 * Manages focusable keyboard/touch navigation state for chart tooltips.
 *
 * - Arrow keys cycle through data points when the chart has focus.
 * - Escape hides the tooltip.
 * - Touch/pointer hovers are wired via showAt/hide.
 * - Screen readers receive an aria-describedby live-region with the
 *   current point's value.
 */
export function useChartTooltip({
  ariaLabel,
  describePoint,
  dataLength,
}: UseChartTooltipOptions): UseChartTooltipReturn {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const tooltipId = useId();
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isVisible = activeIndex !== null;
  const activeDescription =
    activeIndex !== null ? describePoint(activeIndex) : "";

  const showAt = useCallback((index: number) => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setActiveIndex(index);
  }, []);

  const hide = useCallback(() => {
    // Small delay so moving between adjacent touch targets doesn't flicker
    hideTimerRef.current = setTimeout(() => {
      setActiveIndex(null);
    }, 80);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, length: number) => {
      if (length === 0) return;

      switch (e.key) {
        case "ArrowRight":
        case "ArrowUp": {
          e.preventDefault();
          setActiveIndex((prev) => {
            if (prev === null) return 0;
            return (prev + 1) % length;
          });
          break;
        }
        case "ArrowLeft":
        case "ArrowDown": {
          e.preventDefault();
          setActiveIndex((prev) => {
            if (prev === null) return length - 1;
            return (prev - 1 + length) % length;
          });
          break;
        }
        case "Home": {
          e.preventDefault();
          setActiveIndex(0);
          break;
        }
        case "End": {
          e.preventDefault();
          setActiveIndex(length - 1);
          break;
        }
        case "Escape": {
          setActiveIndex(null);
          break;
        }
        default:
          break;
      }
    },
    []
  );

  const containerProps = {
    tabIndex: 0,
    role: "img" as const,
    "aria-label": ariaLabel,
    "aria-describedby": tooltipId,
    onKeyDown: (e: React.KeyboardEvent) => handleKeyDown(e, dataLength),
    onBlur: hide,
  };

  return {
    activeIndex,
    isVisible,
    activeDescription,
    tooltipId,
    handleKeyDown,
    showAt,
    hide,
    containerProps,
  };
}
