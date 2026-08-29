import { useEffect, useRef } from "react";

interface UseFocusTrapOptions {
  isActive: boolean;
  /** CSS selector for the element to focus when the trap activates */
  initialFocus?: string;
}

/**
 * Traps keyboard focus inside a container while `isActive` is true.
 *
 * Behaviour:
 * - Moves focus to `initialFocus` (or the first focusable element) on open.
 * - Wraps Tab / Shift+Tab at the boundaries.
 * - Restores focus to the previously-focused element on close.
 * - If the previously-focused element is gone from the DOM, falls back to
 *   `document.body` so the user is never left without a focus target.
 */
import { useRef, useEffect } from "react";
import { pushOverlay, popOverlay, isTopOverlay } from "./overlayManager";

export function useFocusTrap({ isActive, initialFocus }: UseFocusTrapOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Captured when the trap activates, not when it deactivates.
  const previousActiveElement = useRef<Element | null>(null);
  // Store rAF id so it can be cancelled on cleanup
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    // Register this overlay as active so global handlers can determine the
    // topmost overlay in nested scenarios.
    pushOverlay(container);

    // Capture the trigger element before we move focus away.
    previousActiveElement.current = document.activeElement;

    const FOCUSABLE_SELECTORS = [
      "button:not([disabled]):not([tabindex='-1'])",
      "input:not([disabled]):not([tabindex='-1'])",
      "select:not([disabled]):not([tabindex='-1'])",
      "textarea:not([disabled]):not([tabindex='-1'])",
      "a[href]:not([tabindex='-1'])",
      "[tabindex]:not([tabindex='-1'])",
      "[role='button']:not([disabled]):not([tabindex='-1'])",
      "[role='switch']:not([disabled]):not([tabindex='-1'])",
    ].join(", ");

    const getFocusableElements = (): HTMLElement[] =>
      Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
      ).filter((el) => !el.closest("[hidden]") && el.offsetParent !== null);

    // Move focus to the designated initial element (or first focusable).
    const focusInitial = () => {
      const elements = getFocusableElements();
      if (elements.length === 0) return;
      const target = initialFocus
        ? container.querySelector<HTMLElement>(initialFocus) ?? elements[0]
        : elements[0];
      target?.focus({ preventScroll: true });
    };

    // Try to focus immediately first — this helps in test environments where
    // rAF may not fire reliably. Then also schedule rAF and a short timeout
    // as fallbacks so real browsers with animations still get a stable timing.
    try {
      focusInitial();
    } catch (err) {
      // swallow — focusing can fail in odd test environments
    }

    rafRef.current = window.requestAnimationFrame(() => focusInitial());
    // Also schedule a short timeout as a fallback for environments where rAF
    // may not run predictably (JS DOM in tests). This makes tests more robust.
    timeoutRef.current = window.setTimeout(() => focusInitial(), 20);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const elements = getFocusableElements();
      if (elements.length === 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;

      // Only enforce the focus trap if either:
      // - focus is currently inside this container, or
      // - this overlay is the topmost one. This avoids interfering with
      //   nested overlays where a topmost child should control Tab behavior.
      if (!container.contains(active) && !isTopOverlay(container)) return;

      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus({ preventScroll: true });
        }
      } else {
        if (active === last || !container.contains(active)) {
          e.preventDefault();
          first.focus({ preventScroll: true });
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      document.removeEventListener("keydown", handleKeyDown);

      // Unregister from overlay stack so underlying overlays regain topmost status.
      popOverlay(container);

      // Restore focus — fall back to body if the element is gone from the DOM.
      const prev = previousActiveElement.current;
      if (prev instanceof HTMLElement && document.contains(prev)) {
        prev.focus({ preventScroll: true });
      } else {
        (document.body as HTMLElement).focus();
      }
    };
  }, [isActive, initialFocus]);

  return containerRef;
}
