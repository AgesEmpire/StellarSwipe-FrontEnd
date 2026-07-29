"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface ShareActionsProps {
  content: string;
  title?: string;
  format?: "text" | "html" | "markdown";
  className?: string;
}

export function ShareActions({
  content,
  title = "StellarSwipe",
  format = "text",
  className,
}: ShareActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }, [content]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: content });
      } catch {
        // User cancelled or share failed — ignore
      }
    } else {
      await handleCopy();
    }
  }, [content, title, handleCopy]);

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy to clipboard"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
          "border border-border bg-surface hover:bg-surface-high/10",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          copied && "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400"
        )}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>

      <button
        type="button"
        onClick={handleShare}
        aria-label="Share"
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-surface-high/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
      </button>
    </div>
  );
}
