"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClipboard } from "@/hooks/useClipboard";

export interface CopyButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** The text value to copy to the clipboard */
  value: string;
  /** Label shown in the tooltip / aria-label before copying */
  label?: string;
  /** How long (ms) the "Copied!" state persists. Default: 2000 */
  resetDelay?: number;
}

/**
 * CopyButton — copies `value` to the clipboard on click and shows a brief
 * "Copied!" confirmation that disappears automatically.
 *
 * Works across browsers via the Clipboard API with a legacy execCommand
 * fallback (see useClipboard hook).
 */
const CopyButton = React.forwardRef<HTMLButtonElement, CopyButtonProps>(
  (
    { value, label = "Copy", resetDelay = 2000, className, ...props },
    ref
  ) => {
    const { copied, copy } = useClipboard({ resetDelay });

    return (
      <button
        ref={ref}
        type="button"
        aria-label={copied ? "Copied!" : label}
        title={copied ? "Copied!" : label}
        onClick={() => copy(value)}
        className={cn(
          // Base styles
          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium",
          "transition-all duration-200 select-none",
          // Default appearance
          "border border-input bg-background text-muted-foreground",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50",
          // Copied state
          copied && "border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400",
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "transition-transform duration-200",
            copied ? "scale-110" : "scale-100"
          )}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </span>
        <span>{copied ? "Copied!" : label}</span>
      </button>
    );
  }
);
CopyButton.displayName = "CopyButton";

export { CopyButton };
