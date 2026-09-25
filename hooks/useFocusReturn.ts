"use client";

import { useEffect, useRef } from "react";

/**
 * useFocusReturn
 * ──────────────
 * Captures the element that was focused when `isOpen` transitions to `true`,
 * and restores focus to it when `isOpen` transitions back to `false`.
 *
 * Use this hook for any overlay (modal, drawer, bottom-sheet, popover) that
 * does not already rely on `useFocusTrap`.  Components that already use
 * `useFocusTrap` get focus-restore for free — this hook is the lightweight
 * alternative for cases where a full trap is not required.
 *
 * Behaviour
 * ─────────
 * - On open: captures `document.activeElement`.
 * - On close: restores focus to the captured element.
 * - Falls back to `document.body` if the captured element is no longer in
 *   the DOM (e.g. the trigger button was conditionally removed).
 * - Handles nested overlays correctly: each overlay independently captures
 *   its own origin element, so closing an inner overlay returns focus to the
 *   inner trigger, not the outermost trigger.
 *
 * @param isOpen  Whether the overlay is currently open.
 *
 * @example
 * function MyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
 *   useFocusReturn(open);
 *   // …
 * }
 */
export function useFocusReturn(isOpen: boolean): void {
  const returnTargetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Capture the currently-focused element the moment the overlay opens.
      if (document.activeElement instanceof HTMLElement) {
        returnTargetRef.current = document.activeElement;
      }
    } else {
      // Restore focus when the overlay closes.
      const target = returnTargetRef.current;
      if (target && document.contains(target)) {
        target.focus({ preventScroll: true });
      } else {
        // Fall back to body so the user is never left without a focus target.
        document.body.focus();
      }
      returnTargetRef.current = null;
    }
  }, [isOpen]);
}
