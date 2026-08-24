import {
  computeTaxReport,
  type TaxJurisdiction,
  type TaxableTransaction,
  type TaxReport,
} from "@/lib/taxUtils";

export interface YearSummary {
  year: number;
  report: TaxReport;
  netGainLoss: number;
  totalFees: number;
  estimatedTaxLiability: number;
  tradeCount: number;
}

/**
 * Build per-year tax summaries for the given set of years (issue #351).
 */
export function buildMultiYearSummaries(
  transactions: TaxableTransaction[],
  years: number[],
  jurisdiction: TaxJurisdiction
): YearSummary[] {
  const uniqueYears = [...new Set(years)].sort((a, b) => b - a);
  return uniqueYears.map((year) => {
    const report = computeTaxReport(transactions, year, jurisdiction);
    return {
      year,
      report,
      netGainLoss: report.totalGainLoss,
      totalFees: report.totalFees,
      estimatedTaxLiability: report.estimatedTaxLiability,
      tradeCount: report.entries.length,
    };
  });
}

/** Format a year list for export / UI labels, e.g. "2024, 2025". */
export function formatCoveredYears(years: number[]): string {
  if (years.length === 0) return "";
  return [...new Set(years)].sort((a, b) => a - b).join(", ");
}
