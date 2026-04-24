"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";

export interface CopyFieldProps {
  /** The full value (wallet address, tx hash, etc.) */
  value: string;
  /** Optional label shown above the field */
  label?: string;
  /** Truncate the displayed value. Default: true */
  truncate?: boolean;
  /** Number of chars to show at start/end when truncated. Default: 8 */
  truncateChars?: number;
  className?: string;
}

/**
 * CopyField — displays a truncated address/hash with an inline CopyButton.
 * Suitable for wallet addresses and transaction hashes.
 */
export function CopyField({
  value,
  label,
  truncate = true,
  truncateChars = 8,
  className,
}: CopyFieldProps) {
  const display =
    truncate && value.length > truncateChars * 2 + 3
      ? `${value.slice(0, truncateChars)}...${value.slice(-truncateChars)}`
      : value;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      )}
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-2"
        )}
      >
        <span
          className="flex-1 truncate font-mono text-sm text-foreground"
          title={value}
          aria-label={value}
        >
          {display}
        </span>
        <CopyButton value={value} label={`Copy ${label ?? "value"}`} />
      </div>
    </div>
  );
}
