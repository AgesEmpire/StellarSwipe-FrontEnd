"use client";

import { useMemo, useState } from "react";
import {
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Globe,
  BarChart2,
  Receipt,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExportPreviewDialog } from "@/components/ExportPreviewDialog";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useTransactionStore } from "@/store/useTransactionStore";
import {
  type TaxJurisdiction,
  type TaxableTransaction,
  type CsvPreset,
  TAX_RATES,
  CSV_PRESETS,
  computeTaxReport,
  exportToCsvWithPreset,
  formatForTurboTax,
  formatForTaxAct,
  triggerDownload,
} from "@/lib/taxUtils";

const JURISDICTIONS: TaxJurisdiction[] = ["US", "UK", "EU", "CA"];

const CURRENT_YEAR = new Date().getFullYear();
const AVAILABLE_YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

function deriveTransactions(
  history: ReturnType<typeof useTransactionStore.getState>["history"]
): TaxableTransaction[] {
  return history
    .filter((tx) => tx.status === "SUCCEEDED")
    .map((tx) => {
      const sellPrice = parseFloat(tx.price);
      const amount = parseFloat(tx.amount);
      const fee = parseFloat(tx.fee);
      const gainFactor =
        tx.outcome === "WIN" ? 0.1 : tx.outcome === "LOSS" ? -0.08 : 0;
      const buyPrice = sellPrice / (1 + gainFactor);

      const hasForeignCurrency =
        tx.assetPair.includes("USDC") && !tx.assetPair.startsWith("USDC");

      return {
        id: tx.id,
        assetPair: tx.assetPair,
        amount,
        buyPrice,
        sellPrice,
        fee,
        timestamp: tx.timestamp,
        acquisitionDate: tx.timestamp - 90 * 24 * 60 * 60 * 1000,
        foreignCurrency: hasForeignCurrency ? "USDC" : undefined,
        conversionRate: hasForeignCurrency ? 1.0 : undefined,
      };
    });
}

function SummaryCard({
  label,
  value,
  sub,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5">
        <Icon
          size={13}
          className={cn("shrink-0", className)}
          aria-hidden="true"
        />
        <span className="text-[11px] text-foreground-muted">{label}</span>
      </div>
      <p className={cn("text-sm font-semibold leading-tight", className)}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-foreground-subtle">{sub}</p>}
    </div>
  );
}

export function TaxReportingTool() {
  const { history } = useTransactionStore();
  const [jurisdiction, setJurisdiction] = useState<TaxJurisdiction>("US");
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [csvPreset, setCsvPreset] = useState<CsvPreset>("generic");
  const [pendingExport, setPendingExport] = useState<
    "csv" | "pdf" | "turbotax" | "taxact" | null
  >(null);

  const transactions = useMemo(() => deriveTransactions(history), [history]);

  const currentReport = useMemo(
    () => computeTaxReport(transactions, selectedYear, jurisdiction),
    [transactions, selectedYear, jurisdiction]
  );

  const previousReport = useMemo(
    () => computeTaxReport(transactions, selectedYear - 1, jurisdiction),
    [transactions, selectedYear, jurisdiction]
  );

  const rates = TAX_RATES[jurisdiction];
  const netGainLoss = currentReport.totalGainLoss;
  const isGain = netGainLoss >= 0;

  const yoyChange =
    previousReport.totalGainLoss !== 0
      ? ((netGainLoss - previousReport.totalGainLoss) /
          Math.abs(previousReport.totalGainLoss)) *
        100
      : null;

  const exportPreviewConfig: Record<
    "csv" | "pdf" | "turbotax" | "taxact",
    {
      title: string;
      description: string;
      confirmLabel: string;
      items: { label: string; value: string }[];
    }
  > = {
    csv: {
      title: "Export tax report as CSV",
      description: `Your ${selectedYear} ${jurisdiction} report will download using the ${CSV_PRESETS[csvPreset].label} preset.`,
      confirmLabel: "Download CSV",
      items: [
        { label: "Tax year", value: String(selectedYear) },
        { label: "Jurisdiction", value: jurisdiction },
        { label: "Preset", value: CSV_PRESETS[csvPreset].label },
        {
          label: "Filename",
          value: `tax-report-${selectedYear}-${jurisdiction}-${csvPreset}.csv`,
        },
      ],
    },
    pdf: {
      title: "Export tax report as PDF",
      description:
        "Your browser's print dialog will open — choose \"Save as PDF\" to export.",
      confirmLabel: "Open print dialog",
      items: [
        { label: "Tax year", value: String(selectedYear) },
        { label: "Jurisdiction", value: jurisdiction },
      ],
    },
    turbotax: {
      title: "Export for TurboTax",
      description: `Your ${selectedYear} ${jurisdiction} report will download in TurboTax .txf format.`,
      confirmLabel: "Download .txf",
      items: [
        { label: "Tax year", value: String(selectedYear) },
        { label: "Jurisdiction", value: jurisdiction },
        {
          label: "Filename",
          value: `turbotax-${selectedYear}-${jurisdiction}.txf`,
        },
      ],
    },
    taxact: {
      title: "Export for TaxAct",
      description: `Your ${selectedYear} ${jurisdiction} report will download as a TaxAct-formatted CSV.`,
      confirmLabel: "Download CSV",
      items: [
        { label: "Tax year", value: String(selectedYear) },
        { label: "Jurisdiction", value: jurisdiction },
        {
          label: "Filename",
          value: `taxact-${selectedYear}-${jurisdiction}.csv`,
        },
      ],
    },
  };

  function handleExportCsv() {
    setPendingExport("csv");
  }

  function handleExportPdf() {
    setPendingExport("pdf");
  }

  function handleExportTurboTax() {
    setPendingExport("turbotax");
  }

  function handleExportTaxAct() {
    setPendingExport("taxact");
  }

  function runPendingExport() {
    if (pendingExport === "csv") {
      const csv = exportToCsvWithPreset(currentReport, csvPreset);
      triggerDownload(
        csv,
        `tax-report-${selectedYear}-${jurisdiction}-${csvPreset}.csv`,
        "text/csv"
      );
      toast.success("Tax report downloaded", {
        description: `${selectedYear} ${jurisdiction} report saved as CSV.`,
      });
      return;
    }

    if (pendingExport === "pdf") {
      window.print();
      return;
    }

    if (pendingExport === "turbotax") {
      const txf = formatForTurboTax(currentReport);
      triggerDownload(
        txf,
        `turbotax-${selectedYear}-${jurisdiction}.txf`,
        "text/plain"
      );
      toast.success("TurboTax file downloaded", {
        description: `${selectedYear} ${jurisdiction} report saved as .txf.`,
      });
      return;
    }

    if (pendingExport === "taxact") {
      const csv = formatForTaxAct(currentReport);
      triggerDownload(
        csv,
        `taxact-${selectedYear}-${jurisdiction}.csv`,
        "text/csv"
      );
      toast.success("TaxAct file downloaded", {
        description: `${selectedYear} ${jurisdiction} report saved as CSV.`,
      });
    }
  }

  return (
    <section className="space-y-6" aria-label="Tax Reporting Tool">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-blue-400" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-foreground">
            Tax Report Generator
          </h2>
        </div>
        <p className="text-sm text-foreground-muted">
          Generate tax documents based on your trading activity for the selected
          year and jurisdiction.
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-4 pb-4 px-4 flex flex-wrap gap-4">
          {/* Jurisdiction */}
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label
              htmlFor="jurisdiction-select"
              className="text-xs font-medium text-foreground-muted flex items-center gap-1"
            >
              <Globe size={11} aria-hidden="true" />
              Tax Jurisdiction
            </label>
            <select
              id="jurisdiction-select"
              value={jurisdiction}
              onChange={(e) =>
                setJurisdiction(e.target.value as TaxJurisdiction)
              }
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Select tax jurisdiction"
            >
              {JURISDICTIONS.map((j) => (
                <option key={j} value={j}>
                  {TAX_RATES[j].label} ({j})
                </option>
              ))}
            </select>
          </div>

          {/* Tax year */}
          <div className="flex flex-col gap-1.5 min-w-[120px]">
            <label
              htmlFor="year-select"
              className="text-xs font-medium text-foreground-muted flex items-center gap-1"
            >
              <BarChart2 size={11} aria-hidden="true" />
              Tax Year
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Select tax year"
            >
              {AVAILABLE_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Tax rate info */}
          <div className="flex flex-col gap-1.5 justify-end">
            <p className="text-xs text-foreground-muted">
              Short-term rate:{" "}
              <span className="font-semibold text-foreground">
                {(rates.shortTerm * 100).toFixed(1)}%
              </span>
            </p>
            <p className="text-xs text-foreground-muted">
              Long-term rate:{" "}
              <span className="font-semibold text-foreground">
                {(rates.longTerm * 100).toFixed(1)}%
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard
          label="Net Gain/Loss"
          value={`${isGain ? "+" : ""}$${Math.abs(netGainLoss).toFixed(2)}`}
          icon={isGain ? TrendingUp : TrendingDown}
          className={isGain ? "text-green-400" : "text-red-400"}
        />
        <SummaryCard
          label="Short-Term Gains"
          value={`$${currentReport.shortTermGains.toFixed(2)}`}
          sub={`Losses: $${currentReport.shortTermLosses.toFixed(2)}`}
          icon={TrendingUp}
          className="text-amber-400"
        />
        <SummaryCard
          label="Long-Term Gains"
          value={`$${currentReport.longTermGains.toFixed(2)}`}
          sub={`Losses: $${currentReport.longTermLosses.toFixed(2)}`}
          icon={TrendingUp}
          className="text-sky-400"
        />
        <SummaryCard
          label="Total Fees"
          value={`$${currentReport.totalFees.toFixed(4)}`}
          icon={Receipt}
          className="text-violet-400"
        />
        <SummaryCard
          label="Est. Tax Liability"
          value={`$${currentReport.estimatedTaxLiability.toFixed(2)}`}
          sub={rates.label}
          icon={DollarSign}
          className="text-orange-400"
        />
      </div>

      {/* Year-over-year comparison */}
      {yoyChange !== null && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-foreground">
              Year-over-Year Comparison ({selectedYear - 1} → {selectedYear})
            </h3>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-foreground-muted">
                  {selectedYear - 1} Net Gain/Loss
                </span>
                <span
                  className={cn(
                    "font-semibold",
                    previousReport.totalGainLoss >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  )}
                >
                  {previousReport.totalGainLoss >= 0 ? "+" : ""}$
                  {Math.abs(previousReport.totalGainLoss).toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-foreground-muted">
                  {selectedYear} Net Gain/Loss
                </span>
                <span
                  className={cn(
                    "font-semibold",
                    currentReport.totalGainLoss >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  )}
                >
                  {currentReport.totalGainLoss >= 0 ? "+" : ""}$
                  {Math.abs(currentReport.totalGainLoss).toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-foreground-muted">Change</span>
                <span
                  className={cn(
                    "font-semibold",
                    yoyChange >= 0 ? "text-green-400" : "text-red-400"
                  )}
                >
                  {yoyChange >= 0 ? "+" : ""}
                  {yoyChange.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trade-level breakdown */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-foreground">
            Trade-Level Breakdown ({selectedYear})
          </h3>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {currentReport.entries.length === 0 ? (
            <p className="text-sm text-foreground-muted text-center py-6">
              No taxable trades found for {selectedYear}.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table
                className="w-full text-xs"
                aria-label={`Trade breakdown for ${selectedYear}`}
              >
                <thead>
                  <tr className="border-b border-border text-foreground-muted">
                    <th className="pb-2 text-left font-medium pr-4">Date</th>
                    <th className="pb-2 text-left font-medium pr-4">Pair</th>
                    <th className="pb-2 text-right font-medium pr-4">
                      Proceeds
                    </th>
                    <th className="pb-2 text-right font-medium pr-4">
                      Cost Basis
                    </th>
                    <th className="pb-2 text-right font-medium pr-4">
                      Gain/Loss
                    </th>
                    <th className="pb-2 text-right font-medium pr-4">Fees</th>
                    <th className="pb-2 text-left font-medium pr-4">Term</th>
                    <th className="pb-2 text-left font-medium">FX</th>
                  </tr>
                </thead>
                <tbody>
                  {currentReport.entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="py-2 pr-4 text-foreground-muted">
                        {entry.date.toISOString().split("T")[0]}
                      </td>
                      <td className="py-2 pr-4 font-mono font-medium text-foreground">
                        {entry.assetPair}
                      </td>
                      <td className="py-2 pr-4 text-right text-foreground">
                        ${entry.proceeds.toFixed(2)}
                      </td>
                      <td className="py-2 pr-4 text-right text-foreground">
                        ${entry.costBasis.toFixed(2)}
                      </td>
                      <td
                        className={cn(
                          "py-2 pr-4 text-right font-medium",
                          entry.gainLoss >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        )}
                      >
                        {entry.gainLoss >= 0 ? "+" : ""}$
                        {entry.gainLoss.toFixed(2)}
                      </td>
                      <td className="py-2 pr-4 text-right text-foreground-muted">
                        ${entry.fees.toFixed(4)}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                            entry.isLongTerm
                              ? "bg-sky-500/15 text-sky-400"
                              : "bg-amber-500/15 text-amber-400"
                          )}
                        >
                          {entry.isLongTerm ? "Long" : "Short"}
                        </span>
                      </td>
                      <td className="py-2 text-foreground-muted font-mono">
                        {entry.foreignCurrency
                          ? `${
                              entry.foreignCurrency
                            } @${entry.conversionRate?.toFixed(4)}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export section */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-foreground">
            Export Report
          </h3>
          <p className="text-xs text-foreground-muted">
            Download your {selectedYear} tax report in your preferred format.
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="csv-preset-select"
                className="text-xs font-medium text-foreground-muted"
              >
                CSV Format
              </label>
              <select
                id="csv-preset-select"
                value={csvPreset}
                onChange={(e) => setCsvPreset(e.target.value as CsvPreset)}
                className="w-48 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Select CSV export format"
              >
                {(Object.keys(CSV_PRESETS) as CsvPreset[]).map((key) => (
                  <option key={key} value={key}>
                    {CSV_PRESETS[key].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCsv}
                className="gap-1.5"
                aria-label={`Export ${selectedYear} tax report as CSV`}
              >
                <Download size={13} aria-hidden="true" />
                CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportPdf}
                className="gap-1.5"
                aria-label={`Export ${selectedYear} tax report as PDF`}
              >
                <Download size={13} aria-hidden="true" />
                PDF
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportTurboTax}
                className="gap-1.5"
                aria-label={`Export ${selectedYear} tax report for TurboTax`}
              >
                <Download size={13} aria-hidden="true" />
                TurboTax (.txf)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportTaxAct}
                className="gap-1.5"
                aria-label={`Export ${selectedYear} tax report for TaxAct`}
              >
                <Download size={13} aria-hidden="true" />
                TaxAct (.csv)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div
        role="note"
        aria-label="Tax disclaimer"
        className="flex gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm"
      >
        <AlertTriangle
          size={16}
          className="mt-0.5 shrink-0 text-amber-400"
          aria-hidden="true"
        />
        <p className="text-foreground-muted leading-relaxed">
          <span className="font-medium text-amber-400">Disclaimer: </span>
          The information provided by this tool is for informational purposes
          only and does not constitute tax, legal, or financial advice. Tax laws
          vary by jurisdiction and individual circumstances. The estimated tax
          liability shown is a preliminary estimate only. Please consult a
          qualified tax professional before filing your taxes.
        </p>
      </div>

      {pendingExport && (
        <ExportPreviewDialog
          open={pendingExport !== null}
          onOpenChange={(open) => {
            if (!open) setPendingExport(null);
          }}
          title={exportPreviewConfig[pendingExport].title}
          description={exportPreviewConfig[pendingExport].description}
          items={exportPreviewConfig[pendingExport].items}
          confirmLabel={exportPreviewConfig[pendingExport].confirmLabel}
          onConfirm={runPendingExport}
        />
      )}
    </section>
  );
}
