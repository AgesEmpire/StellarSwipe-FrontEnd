"use client";

import { useMemo, useState } from "react";
import { PageTransition } from "@/components/PageTransition";
import { TaxJurisdictionSelector } from "@/components/tax/TaxJurisdictionSelector";
import { TaxSummaryCards } from "@/components/tax/TaxSummaryCards";
import { TaxGainsTable } from "@/components/tax/TaxGainsTable";
import { TaxExportPanel } from "@/components/tax/TaxExportPanel";
import { TaxYearComparison } from "@/components/tax/TaxYearComparison";
import { TaxDisclaimer } from "@/components/tax/TaxDisclaimer";
import { useTaxReportStore } from "@/store/useTaxReportStore";
import {
  buildTaxSummary,
  buildYearOverYearData,
  generateMockTrades,
  SUPPORTED_JURISDICTIONS,
} from "@/lib/taxReport";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const AVAILABLE_YEARS = [2025, 2024, 2023, 2022, 2021];

export default function TaxReportPage() {
  const { jurisdiction, selectedYear, setJurisdiction, setSelectedYear } =
    useTaxReportStore();
  const [showComparison, setShowComparison] = useState(false);

  // Use mock trades — in production these come from the user's transaction history
  const trades = useMemo(() => {
    const allTrades = AVAILABLE_YEARS.flatMap((y) => generateMockTrades(y));
    return allTrades;
  }, []);

  const summary = useMemo(
    () => buildTaxSummary(trades, jurisdiction, selectedYear),
    [trades, jurisdiction, selectedYear]
  );

  const yoyData = useMemo(
    () =>
      showComparison
        ? buildYearOverYearData(trades, jurisdiction, AVAILABLE_YEARS)
        : [],
    [trades, jurisdiction, showComparison]
  );

  return (
    <PageTransition>
      <main className="flex min-h-screen flex-col gap-6 p-4 sm:gap-8 sm:p-8 bg-gray-950 max-w-5xl mx-auto w-full">
        {/* Header */}
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <FileText className="h-5 w-5 text-blue-400" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Tax Report
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Capital gains &amp; losses for your trading activity
              </p>
            </div>
          </div>

          {/* Year selector */}
          <div className="flex items-center gap-3">
            <label htmlFor="tax-year" className="text-sm text-muted-foreground whitespace-nowrap">
              Tax Year
            </label>
            <select
              id="tax-year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-lg border border-border bg-input px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Select tax year"
            >
              {AVAILABLE_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* Disclaimer */}
        <TaxDisclaimer />

        {/* Jurisdiction selector */}
        <TaxJurisdictionSelector
          value={jurisdiction}
          onChange={setJurisdiction}
          jurisdictions={SUPPORTED_JURISDICTIONS}
        />

        {/* Summary cards */}
        <TaxSummaryCards summary={summary} />

        {/* Export panel */}
        <TaxExportPanel summary={summary} />

        {/* Gains table */}
        <TaxGainsTable records={summary.records} />

        {/* Year-over-year comparison toggle */}
        <div>
          <Button
            variant="outline"
            onClick={() => setShowComparison((v) => !v)}
            className="w-full sm:w-auto gap-2"
            aria-expanded={showComparison}
            aria-controls="yoy-comparison"
          >
            {showComparison ? (
              <ChevronUp size={16} aria-hidden="true" />
            ) : (
              <ChevronDown size={16} aria-hidden="true" />
            )}
            {showComparison ? "Hide" : "Show"} Year-over-Year Comparison
          </Button>

          {showComparison && (
            <div id="yoy-comparison" className="mt-4">
              <TaxYearComparison data={yoyData} jurisdiction={jurisdiction} />
            </div>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
