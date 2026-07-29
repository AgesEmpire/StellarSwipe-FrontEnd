export type TaxJurisdiction = "US" | "UK" | "EU" | "CA";

export interface TaxRate {
  shortTerm: number;
  longTerm: number;
  label: string;
}

export const TAX_RATES: Record<TaxJurisdiction, TaxRate> = {
  US: { shortTerm: 0.22, longTerm: 0.15, label: "United States" },
  UK: { shortTerm: 0.2, longTerm: 0.2, label: "United Kingdom" },
  EU: { shortTerm: 0.25, longTerm: 0.25, label: "European Union" },
  CA: { shortTerm: 0.265, longTerm: 0.1325, label: "Canada" },
};

export const LONG_TERM_THRESHOLD_DAYS = 365;

export interface TaxableTransaction {
  id: string;
  assetPair: string;
  amount: number;
  buyPrice: number;
  sellPrice: number;
  fee: number;
  timestamp: number;
  acquisitionDate?: number;
  foreignCurrency?: string;
  conversionRate?: number;
}

export interface TaxEntry {
  id: string;
  assetPair: string;
  amount: number;
  costBasis: number;
  proceeds: number;
  gainLoss: number;
  fees: number;
  isLongTerm: boolean;
  date: Date;
  foreignCurrency?: string;
  conversionRate?: number;
}

export interface TaxReport {
  year: number;
  jurisdiction: TaxJurisdiction;
  shortTermGains: number;
  longTermGains: number;
  shortTermLosses: number;
  longTermLosses: number;
  totalFees: number;
  totalGainLoss: number;
  estimatedTaxLiability: number;
  entries: TaxEntry[];
}

export function computeGainLoss(
  buyPrice: number,
  sellPrice: number,
  amount: number,
  fee: number = 0
): number {
  const proceeds = sellPrice * amount;
  const costBasis = buyPrice * amount + fee;
  return proceeds - costBasis;
}

export function isLongTermHolding(
  acquisitionTimestamp: number,
  disposalTimestamp: number
): boolean {
  const diffMs = disposalTimestamp - acquisitionTimestamp;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= LONG_TERM_THRESHOLD_DAYS;
}

export function computeTaxReport(
  transactions: TaxableTransaction[],
  year: number,
  jurisdiction: TaxJurisdiction
): TaxReport {
  const rates = TAX_RATES[jurisdiction];
  const startOfYear = new Date(year, 0, 1).getTime();
  const endOfYear = new Date(year + 1, 0, 1).getTime();

  const yearTransactions = transactions.filter(
    (tx) => tx.timestamp >= startOfYear && tx.timestamp < endOfYear
  );

  const entries: TaxEntry[] = yearTransactions.map((tx) => {
    const gainLoss = computeGainLoss(
      tx.buyPrice,
      tx.sellPrice,
      tx.amount,
      tx.fee
    );
    const longTerm = tx.acquisitionDate
      ? isLongTermHolding(tx.acquisitionDate, tx.timestamp)
      : false;
    return {
      id: tx.id,
      assetPair: tx.assetPair,
      amount: tx.amount,
      costBasis: tx.buyPrice * tx.amount,
      proceeds: tx.sellPrice * tx.amount,
      gainLoss,
      fees: tx.fee,
      isLongTerm: longTerm,
      date: new Date(tx.timestamp),
      foreignCurrency: tx.foreignCurrency,
      conversionRate: tx.conversionRate,
    };
  });

  const shortTermGains = entries
    .filter((e) => !e.isLongTerm && e.gainLoss > 0)
    .reduce((sum, e) => sum + e.gainLoss, 0);
  const longTermGains = entries
    .filter((e) => e.isLongTerm && e.gainLoss > 0)
    .reduce((sum, e) => sum + e.gainLoss, 0);
  const shortTermLosses = Math.abs(
    entries
      .filter((e) => !e.isLongTerm && e.gainLoss < 0)
      .reduce((sum, e) => sum + e.gainLoss, 0)
  );
  const longTermLosses = Math.abs(
    entries
      .filter((e) => e.isLongTerm && e.gainLoss < 0)
      .reduce((sum, e) => sum + e.gainLoss, 0)
  );

  const totalFees = entries.reduce((sum, e) => sum + e.fees, 0);
  const netShortTerm = shortTermGains - shortTermLosses;
  const netLongTerm = longTermGains - longTermLosses;
  const totalGainLoss = netShortTerm + netLongTerm;
  const estimatedTaxLiability =
    Math.max(0, netShortTerm) * rates.shortTerm +
    Math.max(0, netLongTerm) * rates.longTerm;

  return {
    year,
    jurisdiction,
    shortTermGains,
    longTermGains,
    shortTermLosses,
    longTermLosses,
    totalFees,
    totalGainLoss,
    estimatedTaxLiability,
    entries,
  };
}

export type CsvPreset = "generic" | "cointracker" | "koinly";

export interface CsvPresetDefinition {
  label: string;
  headers: string[];
  row: (e: TaxEntry) => string[];
}

export const CSV_PRESETS: Record<CsvPreset, CsvPresetDefinition> = {
  generic: {
    label: "Generic Spreadsheet",
    headers: [
      "Date",
      "Asset Pair",
      "Amount",
      "Cost Basis (USD)",
      "Proceeds (USD)",
      "Gain/Loss (USD)",
      "Fees (USD)",
      "Term",
      "Foreign Currency",
      "Conversion Rate",
    ],
    row: (e) => [
      e.date.toISOString().split("T")[0],
      e.assetPair,
      e.amount.toFixed(6),
      e.costBasis.toFixed(2),
      e.proceeds.toFixed(2),
      e.gainLoss.toFixed(2),
      e.fees.toFixed(4),
      e.isLongTerm ? "Long-term" : "Short-term",
      e.foreignCurrency ?? "",
      e.conversionRate != null ? e.conversionRate.toFixed(6) : "",
    ],
  },
  cointracker: {
    label: "CoinTracker",
    headers: [
      "Date",
      "Received Quantity",
      "Received Currency",
      "Sent Quantity",
      "Sent Currency",
      "Fee Amount",
      "Fee Currency",
      "Tag",
    ],
    row: (e) => {
      const [base, quote] = e.assetPair.split("/");
      return [
        e.date.toISOString().split("T")[0],
        e.proceeds.toFixed(2),
        quote ?? "USD",
        e.amount.toFixed(6),
        base ?? e.assetPair,
        e.fees.toFixed(4),
        quote ?? "USD",
        e.isLongTerm ? "long-term" : "short-term",
      ];
    },
  },
  koinly: {
    label: "Koinly",
    headers: [
      "Date",
      "Sent Amount",
      "Sent Currency",
      "Received Amount",
      "Received Currency",
      "Fee Amount",
      "Fee Currency",
      "Net Worth Amount",
      "Net Worth Currency",
      "Label",
      "Description",
      "TxHash",
    ],
    row: (e) => {
      const [base, quote] = e.assetPair.split("/");
      return [
        e.date.toISOString(),
        e.amount.toFixed(6),
        base ?? e.assetPair,
        e.proceeds.toFixed(2),
        quote ?? "USD",
        e.fees.toFixed(4),
        quote ?? "USD",
        e.proceeds.toFixed(2),
        quote ?? "USD",
        "",
        e.assetPair,
        e.id,
      ];
    },
  },
};

export function exportToCsvWithPreset(
  report: TaxReport,
  preset: CsvPreset = "generic"
): string {
  const { headers, row } = CSV_PRESETS[preset];
  const rows = report.entries.map(row);
  return [headers, ...rows]
    .map((r) => r.map((v) => `"${v}"`).join(","))
    .join("\n");
}

export function exportToCsv(report: TaxReport): string {
  return exportToCsvWithPreset(report, "generic");
}

export function formatForTurboTax(report: TaxReport): string {
  const lines: string[] = [
    "V042",
    "A TurboTax Export - StellarSwipe",
    `D${new Date().toLocaleDateString("en-US")}`,
    "^",
  ];
  report.entries.forEach((e) => {
    lines.push(
      "TD",
      `N${e.assetPair}`,
      `D${e.date.toLocaleDateString("en-US")}`,
      `$${e.proceeds.toFixed(2)}`,
      `$${e.costBasis.toFixed(2)}`,
      "^"
    );
  });
  return lines.join("\n");
}

export function formatForTaxAct(report: TaxReport): string {
  const headers = [
    "Description",
    "Date Acquired",
    "Date Sold",
    "Proceeds",
    "Cost Basis",
    "Gain/Loss",
  ];
  const rows = report.entries.map((e) => [
    e.assetPair,
    "Various",
    e.date.toISOString().split("T")[0],
    e.proceeds.toFixed(2),
    e.costBasis.toFixed(2),
    e.gainLoss.toFixed(2),
  ]);
  return [headers, ...rows]
    .map((r) => r.map((v) => `"${v}"`).join(","))
    .join("\n");
}

export function triggerDownload(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
