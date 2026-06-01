"use client";

import { AlertTriangle } from "lucide-react";

export function TaxDisclaimer() {
  return (
    <div
      role="note"
      aria-label="Tax disclaimer"
      className="flex gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4"
    >
      <AlertTriangle
        className="h-5 w-5 flex-shrink-0 text-yellow-400 mt-0.5"
        aria-hidden="true"
      />
      <div className="text-sm">
        <p className="font-semibold text-yellow-300 mb-1">
          Preliminary Estimates Only — Consult a Tax Professional
        </p>
        <p className="text-yellow-200/80 leading-relaxed">
          This tool provides preliminary estimates based on your trading activity and should
          not be used as official tax advice. Tax laws vary by jurisdiction and change
          frequently. Always consult a qualified tax professional or accountant before
          filing your taxes. StellarSwipe is not responsible for any tax liabilities
          arising from the use of this tool.
        </p>
      </div>
    </div>
  );
}
