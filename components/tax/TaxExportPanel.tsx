"use client";

import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  exportToCSV,
  exportToTurboTax,
  exportToTaxAct,
  downloadFile,
  type TaxSummary,
  type ExportFormat,
} from "@/lib/taxReport";
import { Download, FileText, CheckCircle } from "lucide-react";

interface TaxExportPanelProps {
  summary: TaxSummary;
}

interface ExportOption {
  format: ExportFormat;
  label: string;
  description: string;
  icon: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    format: "CSV",
    label: "CSV",
    description: "Universal spreadsheet format",
    icon: "📊",
  },
  {
    format: "TURBOTAX",
    label: "TurboTax",
    description: "Form 8949 compatible",
    icon: "🧾",
  },
  {
    format: "TAXACT",
    label: "TaxAct",
    description: "TaxAct import format",
    icon: "📋",
  },
  {
    format: "PDF",
    label: "PDF",
    description: "Printable summary report",
    icon: "📄",
  },
];

export function TaxExportPanel({ summary }: TaxExportPanelProps) {
  const [exported, setExported] = useState<ExportFormat | null>(null);
  const [loading, setLoading] = useState<ExportFormat | null>(null);

  async function handleExport(format: ExportFormat) {
    setLoading(format);
    // Simulate async processing
    await new Promise((r) => setTimeout(r, 400));

    const filename = `stellarswipe-tax-${summary.jurisdiction}-${summary.taxYear}`;

    if (format === "CSV") {
      const content = exportToCSV(summary);
      downloadFile(content, `${filename}.csv`, "text/csv");
    } else if (format === "TURBOTAX") {
      const content = exportToTurboTax(summary);
      downloadFile(content, `${filename}-turbotax.csv`, "text/csv");
    } else if (format === "TAXACT") {
      const content = exportToTaxAct(summary);
      downloadFile(content, `${filename}-taxact.csv`, "text/csv");
    } else if (format === "PDF") {
      // PDF: generate a printable HTML page and trigger print dialog
      const printContent = buildPrintableReport(summary);
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(printContent);
        win.document.close();
        win.focus();
        win.print();
      }
    }

    setLoading(null);
    setExported(format);
    setTimeout(() => setExported(null), 3000);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-base font-semibold text-foreground">Export Report</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Download your {summary.taxYear} tax data in your preferred format
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {EXPORT_OPTIONS.map((opt) => {
            const isLoading = loading === opt.format;
            const isDone = exported === opt.format;
            return (
              <button
                key={opt.format}
                onClick={() => handleExport(opt.format)}
                disabled={isLoading || summary.records.length === 0}
                aria-label={`Export as ${opt.label}`}
                aria-busy={isLoading}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  isDone
                    ? "border-green-500/50 bg-green-500/10"
                    : "border-border bg-card hover:border-border-strong hover:bg-muted/30"
                )}
              >
                <span className="text-2xl" aria-hidden="true">
                  {isDone ? "✅" : opt.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                </div>
                {isLoading && (
                  <span className="text-xs text-muted-foreground animate-pulse">
                    Generating…
                  </span>
                )}
                {isDone && (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <CheckCircle size={12} aria-hidden="true" />
                    Downloaded
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {summary.records.length === 0 && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            No records to export for this period.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Printable PDF Report ─────────────────────────────────────────────────────

function buildPrintableReport(summary: TaxSummary): string {
  const rows = summary.records
    .map(
      (r) => `
      <tr>
        <td>${r.asset}</td>
        <td>${new Date(r.acquiredAt).toLocaleDateString()}</td>
        <td>${new Date(r.disposedAt).toLocaleDateString()}</td>
        <td>$${r.proceeds.toFixed(2)}</td>
        <td>$${r.costBasis.toFixed(2)}</td>
        <td style="color:${r.gain >= 0 ? "green" : "red"}">
          ${r.gain >= 0 ? "+" : ""}$${r.gain.toFixed(2)}
        </td>
        <td>${r.gainType === "SHORT_TERM" ? "Short-Term" : "Long-Term"}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>StellarSwipe Tax Report ${summary.taxYear} — ${summary.jurisdiction}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 32px; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .subtitle { color: #666; margin-bottom: 24px; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
    .card { border: 1px solid #ddd; border-radius: 6px; padding: 12px; }
    .card-label { font-size: 10px; color: #888; margin-bottom: 4px; }
    .card-value { font-size: 16px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f5f5f5; text-align: left; padding: 8px; border-bottom: 2px solid #ddd; font-size: 11px; }
    td { padding: 7px 8px; border-bottom: 1px solid #eee; }
    .disclaimer { margin-top: 24px; padding: 12px; background: #fffbeb; border: 1px solid #f59e0b; border-radius: 6px; font-size: 10px; color: #92400e; }
    @media print { body { margin: 16px; } }
  </style>
</head>
<body>
  <h1>StellarSwipe Tax Report</h1>
  <p class="subtitle">Tax Year ${summary.taxYear} · Jurisdiction: ${summary.jurisdiction}</p>

  <div class="summary">
    <div class="card">
      <div class="card-label">Total Gains / Losses</div>
      <div class="card-value" style="color:${summary.totalGains >= 0 ? "green" : "red"}">
        ${summary.totalGains >= 0 ? "+" : ""}$${summary.totalGains.toFixed(2)}
      </div>
    </div>
    <div class="card">
      <div class="card-label">Short-Term Gains</div>
      <div class="card-value">$${summary.shortTermGains.toFixed(2)}</div>
    </div>
    <div class="card">
      <div class="card-label">Long-Term Gains</div>
      <div class="card-value">$${summary.longTermGains.toFixed(2)}</div>
    </div>
    <div class="card">
      <div class="card-label">Est. Tax Liability</div>
      <div class="card-value">$${summary.estimatedTaxLiability.toFixed(2)}</div>
    </div>
    <div class="card">
      <div class="card-label">Total Fees</div>
      <div class="card-value">$${summary.totalFees.toFixed(2)}</div>
    </div>
    <div class="card">
      <div class="card-label">Total Trades</div>
      <div class="card-value">${summary.totalTrades}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Asset</th>
        <th>Acquired</th>
        <th>Disposed</th>
        <th>Proceeds</th>
        <th>Cost Basis</th>
        <th>Gain / Loss</th>
        <th>Type</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="disclaimer">
    <strong>Disclaimer:</strong> This report is a preliminary estimate only and does not constitute
    official tax advice. Always consult a qualified tax professional before filing.
    StellarSwipe is not responsible for any tax liabilities arising from this report.
  </div>
</body>
</html>`;
}
