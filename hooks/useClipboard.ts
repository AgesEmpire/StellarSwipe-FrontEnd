"use client";

import { useState, useCallback } from "react";

interface UseClipboardOptions {
  /** Duration in ms before the "copied" state resets. Default: 2000 */
  resetDelay?: number;
}

interface UseClipboardReturn {
  copied: boolean;
  copy: (text: string) => Promise<void>;
}

/**
 * Utility hook for copying text to the clipboard with visual feedback state.
 * Falls back to the legacy execCommand approach for browsers that don't
 * support the Clipboard API (e.g. older Safari, non-secure contexts).
 */
export function useClipboard(
  options: UseClipboardOptions = {}
): UseClipboardReturn {
  const { resetDelay = 2000 } = options;
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          // Legacy fallback
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), resetDelay);
      } catch (err) {
        console.error("Failed to copy to clipboard:", err);
      }
    },
    [resetDelay]
  );

  return { copied, copy };
}
