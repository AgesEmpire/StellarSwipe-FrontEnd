"use client";

import { useEffect, useRef, useCallback } from "react";

export interface KeyboardShortcut {
  /** Key to bind (e.g., "?", "n", "Escape") */
  key: string;
  /** Whether Ctrl/Cmd must be held */
  ctrlKey?: boolean;
  /** Whether Meta (Cmd on Mac) must be held */
  metaKey?: boolean;
  /** Whether Shift must be held */
  shiftKey?: boolean;
  /** Description shown in the help modal */
  description: string;
  /** Category for grouping in help modal */
  category?: "Navigation" | "Actions" | "Modals";
  /** Callback when the shortcut is activated */
  handler: () => void;
}

const INPUT_SELECTORS =
  "input:not([type='hidden']):not([disabled]), textarea:not([disabled]), select:not([disabled]), [contenteditable='true']";

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  if (el.matches?.(INPUT_SELECTORS)) return true;
  // Check if focus is inside a contenteditable
  if (el.closest?.("[contenteditable='true']")) return true;
  return false;
}

function shortcutId(s: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}): string {
  return `${s.ctrlKey ? "Ctrl+" : ""}${s.metaKey ? "Meta+" : ""}${s.shiftKey ? "Shift+" : ""}${s.key.toLowerCase()}`;
}

/**
 * Manages global keyboard shortcuts with:
 * - Simple single-key shortcuts (`?`, `n`, `Escape`)
 * - Modifier-key shortcuts (`Ctrl+K`, `Ctrl+Shift+N`)
 * - Sequential shortcuts (`G then N`, `G then B`)
 * - Automatic scoping — shortcuts won't fire when focus is in an input
 * - Clean teardown on unmount
 *
 * @param shortcuts Array of shortcut definitions
 * @param options.sequenceTimeout Timeout in ms for sequential shortcuts (default 1000)
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options?: { sequenceTimeout?: number }
) {
  const timeout = options?.sequenceTimeout ?? 1000;
  const seqRef = useRef<{ prefix: string; timer: ReturnType<typeof setTimeout> | null }>({
    prefix: "",
    timer: null,
  });

  // Build a lookup map for O(1) matching
  const shortcutMapRef = useRef<Map<string, KeyboardShortcut>>(new Map());
  // Separate sequential shortcuts (prefix "g" → subsequent key)
  const seqMapRef = useRef<Map<string, Map<string, KeyboardShortcut>>>(new Map());

  // Rebuild maps when shortcuts change
  useEffect(() => {
    const sm = new Map<string, KeyboardShortcut>();
    const seq = new Map<string, Map<string, KeyboardShortcut>>();

    for (const s of shortcuts) {
      if (s.key.includes(" then ")) {
        // Sequential shortcut: "g then n"
        const [prefix, sub] = s.key.split(" then ").map((k) => k.trim().toLowerCase());
        let subMap = seq.get(prefix);
        if (!subMap) {
          subMap = new Map();
          seq.set(prefix, subMap);
        }
        subMap.set(sub, s);
      } else {
        sm.set(shortcutId(s), s);
      }
    }

    shortcutMapRef.current = sm;
    seqMapRef.current = seq;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trap if user doesn't want input-focused firing
      if (isInputFocused()) return;

      const key = e.key.toLowerCase();
      const seqId = shortcutId({ key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey });

      // 1. Check for simple shortcut match
      const match = shortcutMapRef.current.get(seqId);
      if (match) {
        e.preventDefault();
        match.handler();
        // Cancel any pending sequence
        if (seqRef.current.timer) {
          clearTimeout(seqRef.current.timer);
          seqRef.current.prefix = "";
          seqRef.current.timer = null;
        }
        return;
      }

      // 2. Check for sequential shortcut
      const seq = seqRef.current;
      if (seq.prefix) {
        // We're in a sequence — check if this key completes
        const subMap = seqMapRef.current.get(seq.prefix);
        if (subMap) {
          const seqMatch = subMap.get(key);
          if (seqMatch) {
            e.preventDefault();
            seqMatch.handler();
            seq.prefix = "";
            if (seq.timer) clearTimeout(seq.timer);
            seq.timer = null;
            return;
          }
        }
        // Key doesn't complete the sequence — reset
        seq.prefix = "";
        if (seq.timer) clearTimeout(seq.timer);
        seq.timer = null;
      }

      // 3. Check if this key starts a sequence (only non-modified single keys)
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey && seqMapRef.current.has(key)) {
        e.preventDefault();
        seq.prefix = key;
        seq.timer = setTimeout(() => {
          seq.prefix = "";
          seq.timer = null;
        }, timeout);
      }
    },
    [timeout]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Clean up any pending sequence
      if (seqRef.current.timer) {
        clearTimeout(seqRef.current.timer);
      }
    };
  }, [handleKeyDown]);
}
