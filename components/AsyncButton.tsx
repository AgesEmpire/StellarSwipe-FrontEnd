"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

interface AsyncButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick: () => Promise<void>;
  children: React.ReactNode;
  loadingText?: string;
}

export function AsyncButton({
  onClick,
  children,
  loadingText = "Loading...",
  disabled,
  className,
  ...props
}: AsyncButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) {
        e.preventDefault();
        return;
      }
      setLoading(true);
      try {
        await onClick();
      } finally {
        setLoading(false);
      }
    },
    [onClick, loading, disabled]
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || disabled}
      aria-busy={loading}
      aria-disabled={loading || disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        (loading || disabled) && "cursor-not-allowed opacity-60",
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {loading ? loadingText : children}
    </button>
  );
}
