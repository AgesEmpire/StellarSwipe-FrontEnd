"use client";

import { cn } from "@/lib/utils";
import type { TaxJurisdiction } from "@/lib/taxReport";

interface JurisdictionOption {
  value: TaxJurisdiction;
  label: string;
}

interface TaxJurisdictionSelectorProps {
  value: TaxJurisdiction;
  onChange: (j: TaxJurisdiction) => void;
  jurisdictions: JurisdictionOption[];
}

const FLAG_EMOJI: Record<TaxJurisdiction, string> = {
  US: "🇺🇸",
  UK: "🇬🇧",
  EU: "🇪🇺",
  CA: "🇨🇦",
};

export function TaxJurisdictionSelector({
  value,
  onChange,
  jurisdictions,
}: TaxJurisdictionSelectorProps) {
  return (
    <div>
      <p className="text-sm font-medium text-foreground mb-3">Tax Jurisdiction</p>
      <div
        role="radiogroup"
        aria-label="Select tax jurisdiction"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {jurisdictions.map((j) => (
          <button
            key={j.value}
            role="radio"
            aria-checked={value === j.value}
            onClick={() => onChange(j.value)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              value === j.value
                ? "border-blue-500 bg-blue-500/10 text-blue-300"
                : "border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground"
            )}
          >
            <span aria-hidden="true">{FLAG_EMOJI[j.value]}</span>
            <span>{j.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
