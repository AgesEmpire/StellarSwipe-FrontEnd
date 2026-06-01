/**
 * Tax Report Calculation Engine
 *
 * Supports US, UK, EU, and CA tax jurisdictions.
 * Calculates capital gains/losses, separates short-term vs long-term,
 * tracks fees, and estimates preliminary tax liability.
 *
 * NOTE: This is a preliminary estimation tool only.
 * Always consult a qualified tax professional for official filings.
 */

export type TaxJurisdiction = "US" | "UK" | "EU" | "CA";
export type GainType = "SHORT_TERM" | "LONG_TERM";
export type ExportFormat = "CSV" | "PDF" | "TURBOTAX" | "TAXACT";

export interface TaxableTrade {
  id: string;
  assetPair: string;
  asset: string;
  type: "BUY" | "SELL";
  amount: number;
  price: number;
  /** Price in USD at time of trade (for foreign currency conversion) */
  priceUSD: number;
  fee: number;
  /** Fee in USD */
  feeUSD: number;
  timestamp: number;
  /** ISO currency code of the trade (e.g. "XLM", "USDC") */
  currency: string;
}

export interface TaxLot {
  tradeId: string;
  asset: string;
  amount: number;
  costBasis: number; // per unit in USD
  acquiredAt: number; // timestamp
}

export interface CapitalGainRecord {
  tradeId: string;
  asset: string;
  amount: number;
  proceeds: number; // USD
  costBasis: number; // USD
  gain: number; // proceeds - costBasis - fees
  fees: number; // USD
  gainType: GainType;
  acquiredAt: number;
  disposedAt: number;
  holdingDays: number;
}

export interface TaxSummary {
  jurisdiction: TaxJurisdiction;
  taxYear: number;
  shortTermGains: number;
  longTermGains: number;
  totalGains: number;
  totalFees: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  estimatedTaxLiability: number;
  effectiveTaxRate: number;
  records: CapitalGainRecord[];
  currencyConversions: CurrencyConversion[];
}

export interface CurrencyConversion {
  tradeId: string;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  rateAtTime: number;
  usdValue: number;
  timestamp: number;
}

export interface YearOverYearData {
  year: number;
  shortTermGains: number;
  longTermGains: number;
  totalGains: number;
  totalFees: number;
  estimatedTax: number;
}

// ─── Jurisdiction Tax Rates ───────────────────────────────────────────────────

const TAX_RATES: Record<TaxJurisdiction, {
  shortTermRate: number;
  longTermRate: number;
  longTermThresholdDays: number;
  currencySymbol: string;
  name: string;
}> = {
  US: {
    shortTermRate: 0.37,   // top marginal ordinary income rate
    longTermRate: 0.20,    // top long-term capital gains rate
    longTermThresholdDays: 365,
    currencySymbol: "$",
    name: "United States",
  },
  UK: {
    shortTermRate: 0.20,   // higher rate CGT
    longTermRate: 0.10,    // basic rate CGT (crypto held >1yr treated same)
    longTermThresholdDays: 365,
    currencySymbol: "£",
    name: "United Kingdom",
  },
  EU: {
    shortTermRate: 0.25,   // approximate average EU CGT
    longTermRate: 0.15,
    longTermThresholdDays: 365,
    currencySymbol: "€",
    name: "European Union",
  },
  CA: {
    shortTermRate: 0.265,  // 50% inclusion × top marginal ~53%
    longTermRate: 0.265,   // Canada taxes all gains at same rate (50% inclusion)
    longTermThresholdDays: 365,
    currencySymbol: "CA$",
    name: "Canada",
  },
};

// ─── Core Calculation Functions ───────────────────────────────────────────────

/**
 * Determines if a gain is short-term or long-term based on jurisdiction rules.
 */
export function classifyGain(
  acquiredAt: number,
  disposedAt: number,
  jurisdiction: TaxJurisdiction
): GainType {
  const holdingDays = Math.floor((disposedAt - acquiredAt) / (1000 * 60 * 60 * 24));
  const threshold = TAX_RATES[jurisdiction].longTermThresholdDays;
  return holdingDays >= threshold ? "LONG_TERM" : "SHORT_TERM";
}

/**
 * FIFO (First In, First Out) cost basis calculation.
 * Matches sell orders against the oldest buy lots first.
 */
export function calculateGainsWithFIFO(
  trades: TaxableTrade[],
  jurisdiction: TaxJurisdiction
): CapitalGainRecord[] {
  const lots: Map<string, TaxLot[]> = new Map();
  const records: CapitalGainRecord[] = [];

  // Sort trades chronologically
  const sorted = [...trades].sort((a, b) => a.timestamp - b.timestamp);

  for (const trade of sorted) {
    if (trade.type === "BUY") {
      // Add to lot inventory
      const existing = lots.get(trade.asset) ?? [];
      existing.push({
        tradeId: trade.id,
        asset: trade.asset,
        amount: trade.amount,
        costBasis: trade.priceUSD + trade.feeUSD / trade.amount,
        acquiredAt: trade.timestamp,
      });
      lots.set(trade.asset, existing);
    } else if (trade.type === "SELL") {
      // Match against FIFO lots
      let remainingToSell = trade.amount;
      const assetLots = lots.get(trade.asset) ?? [];

      while (remainingToSell > 0 && assetLots.length > 0) {
        const lot = assetLots[0];
        const soldFromLot = Math.min(lot.amount, remainingToSell);
        const proceeds = soldFromLot * trade.priceUSD;
        const costBasis = soldFromLot * lot.costBasis;
        const fees = (soldFromLot / trade.amount) * trade.feeUSD;
        const gain = proceeds - costBasis - fees;
        const holdingDays = Math.floor(
          (trade.timestamp - lot.acquiredAt) / (1000 * 60 * 60 * 24)
        );

        records.push({
          tradeId: trade.id,
          asset: trade.asset,
          amount: soldFromLot,
          proceeds,
          costBasis,
          gain,
          fees,
          gainType: classifyGain(lot.acquiredAt, trade.timestamp, jurisdiction),
          acquiredAt: lot.acquiredAt,
          disposedAt: trade.timestamp,
          holdingDays,
        });

        remainingToSell -= soldFromLot;
        lot.amount -= soldFromLot;

        if (lot.amount <= 0) {
          assetLots.shift();
        }
      }

      lots.set(trade.asset, assetLots);
    }
  }

  return records;
}

/**
 * Builds a full tax summary for a given year and jurisdiction.
 */
export function buildTaxSummary(
  trades: TaxableTrade[],
  jurisdiction: TaxJurisdiction,
  taxYear: number
): TaxSummary {
  // Filter to the tax year
  const yearStart = new Date(taxYear, 0, 1).getTime();
  const yearEnd = new Date(taxYear + 1, 0, 1).getTime();
  const yearTrades = trades.filter(
    (t) => t.timestamp >= yearStart && t.timestamp < yearEnd
  );

  const records = calculateGainsWithFIFO(yearTrades, jurisdiction);
  const rates = TAX_RATES[jurisdiction];

  const shortTermGains = records
    .filter((r) => r.gainType === "SHORT_TERM")
    .reduce((sum, r) => sum + r.gain, 0);

  const longTermGains = records
    .filter((r) => r.gainType === "LONG_TERM")
    .reduce((sum, r) => sum + r.gain, 0);

  const totalGains = shortTermGains + longTermGains;
  const totalFees = records.reduce((sum, r) => sum + r.fees, 0);

  // Preliminary tax liability estimate
  const shortTermTax = Math.max(0, shortTermGains) * rates.shortTermRate;
  const longTermTax = Math.max(0, longTermGains) * rates.longTermRate;
  const estimatedTaxLiability = shortTermTax + longTermTax;
  const effectiveTaxRate = totalGains > 0 ? estimatedTaxLiability / totalGains : 0;

  // Currency conversions (non-USD trades)
  const currencyConversions: CurrencyConversion[] = yearTrades
    .filter((t) => t.currency !== "USD" && t.currency !== "USDC")
    .map((t) => ({
      tradeId: t.id,
      fromCurrency: t.currency,
      toCurrency: "USD",
      amount: t.amount,
      rateAtTime: t.priceUSD / t.price,
      usdValue: t.amount * t.priceUSD,
      timestamp: t.timestamp,
    }));

  return {
    jurisdiction,
    taxYear,
    shortTermGains,
    longTermGains,
    totalGains,
    totalFees,
    totalTrades: yearTrades.filter((t) => t.type === "SELL").length,
    winningTrades: records.filter((r) => r.gain > 0).length,
    losingTrades: records.filter((r) => r.gain < 0).length,
    estimatedTaxLiability,
    effectiveTaxRate,
    records,
    currencyConversions,
  };
}

/**
 * Builds year-over-year comparison data.
 */
export function buildYearOverYearData(
  trades: TaxableTrade[],
  jurisdiction: TaxJurisdiction,
  years: number[]
): YearOverYearData[] {
  return years.map((year) => {
    const summary = buildTaxSummary(trades, jurisdiction, year);
    return {
      year,
      shortTermGains: summary.shortTermGains,
      longTermGains: summary.longTermGains,
      totalGains: summary.totalGains,
      totalFees: summary.totalFees,
      estimatedTax: summary.estimatedTaxLiability,
    };
  });
}

// ─── Export Formatters ────────────────────────────────────────────────────────

/**
 * Generates CSV content from a tax summary.
 */
export function exportToCSV(summary: TaxSummary): string {
  const headers = [
    "Trade ID",
    "Asset",
    "Amount",
    "Proceeds (USD)",
    "Cost Basis (USD)",
    "Gain/Loss (USD)",
    "Fees (USD)",
    "Gain Type",
    "Acquired Date",
    "Disposed Date",
    "Holding Days",
  ].join(",");

  const rows = summary.records.map((r) =>
    [
      r.tradeId,
      r.asset,
      r.amount.toFixed(8),
      r.proceeds.toFixed(2),
      r.costBasis.toFixed(2),
      r.gain.toFixed(2),
      r.fees.toFixed(2),
      r.gainType,
      new Date(r.acquiredAt).toISOString().split("T")[0],
      new Date(r.disposedAt).toISOString().split("T")[0],
      r.holdingDays,
    ].join(",")
  );

  return [headers, ...rows].join("\n");
}

/**
 * Generates TurboTax-compatible CSV (Form 8949 format).
 */
export function exportToTurboTax(summary: TaxSummary): string {
  const headers = [
    "Description",
    "Date Acquired",
    "Date Sold",
    "Proceeds",
    "Cost Basis",
    "Adjustment Code",
    "Adjustment Amount",
    "Gain or Loss",
  ].join(",");

  const rows = summary.records.map((r) =>
    [
      `${r.amount.toFixed(8)} ${r.asset}`,
      new Date(r.acquiredAt).toLocaleDateString("en-US"),
      new Date(r.disposedAt).toLocaleDateString("en-US"),
      r.proceeds.toFixed(2),
      r.costBasis.toFixed(2),
      "",
      "",
      r.gain.toFixed(2),
    ].join(",")
  );

  return [headers, ...rows].join("\n");
}

/**
 * Generates TaxAct-compatible CSV format.
 */
export function exportToTaxAct(summary: TaxSummary): string {
  const headers = [
    "Asset Description",
    "Quantity",
    "Date Acquired",
    "Date Sold",
    "Sales Price",
    "Cost or Other Basis",
    "Gain or Loss",
    "Short or Long Term",
  ].join(",");

  const rows = summary.records.map((r) =>
    [
      r.asset,
      r.amount.toFixed(8),
      new Date(r.acquiredAt).toLocaleDateString("en-US"),
      new Date(r.disposedAt).toLocaleDateString("en-US"),
      r.proceeds.toFixed(2),
      r.costBasis.toFixed(2),
      r.gain.toFixed(2),
      r.gainType === "SHORT_TERM" ? "S" : "L",
    ].join(",")
  );

  return [headers, ...rows].join("\n");
}

/**
 * Triggers a browser download of the given content.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getTaxRateInfo(jurisdiction: TaxJurisdiction) {
  return TAX_RATES[jurisdiction];
}

export const SUPPORTED_JURISDICTIONS: { value: TaxJurisdiction; label: string }[] = [
  { value: "US", label: "United States" },
  { value: "UK", label: "United Kingdom" },
  { value: "EU", label: "European Union" },
  { value: "CA", label: "Canada" },
];

// ─── Mock Data Generator ──────────────────────────────────────────────────────

/**
 * Generates realistic mock trading history for demonstration purposes.
 */
export function generateMockTrades(year: number): TaxableTrade[] {
  const assets = ["XLM", "BTC", "ETH", "AQUA"];
  const trades: TaxableTrade[] = [];
  let id = 1;

  for (const asset of assets) {
    const basePrice = asset === "BTC" ? 45000 : asset === "ETH" ? 2800 : asset === "XLM" ? 0.48 : 0.12;

    // Buy in Q1
    trades.push({
      id: `mock-${id++}`,
      assetPair: `${asset}/USDC`,
      asset,
      type: "BUY",
      amount: asset === "BTC" ? 0.5 : asset === "ETH" ? 2 : 1000,
      price: basePrice,
      priceUSD: basePrice,
      fee: basePrice * 0.002,
      feeUSD: basePrice * 0.002,
      timestamp: new Date(year, 1, 15).getTime(),
      currency: asset,
    });

    // Sell in Q3 (long-term if year > 1 year ago)
    const sellPrice = basePrice * (1 + (Math.random() * 0.4 - 0.1));
    trades.push({
      id: `mock-${id++}`,
      assetPair: `${asset}/USDC`,
      asset,
      type: "SELL",
      amount: asset === "BTC" ? 0.3 : asset === "ETH" ? 1 : 600,
      price: sellPrice,
      priceUSD: sellPrice,
      fee: sellPrice * 0.002,
      feeUSD: sellPrice * 0.002,
      timestamp: new Date(year, 7, 20).getTime(),
      currency: asset,
    });

    // Short-term trade in Q4
    const stBuyPrice = basePrice * 1.1;
    trades.push({
      id: `mock-${id++}`,
      assetPair: `${asset}/USDC`,
      asset,
      type: "BUY",
      amount: asset === "BTC" ? 0.1 : asset === "ETH" ? 0.5 : 200,
      price: stBuyPrice,
      priceUSD: stBuyPrice,
      fee: stBuyPrice * 0.002,
      feeUSD: stBuyPrice * 0.002,
      timestamp: new Date(year, 10, 5).getTime(),
      currency: asset,
    });

    const stSellPrice = stBuyPrice * (1 + (Math.random() * 0.3 - 0.15));
    trades.push({
      id: `mock-${id++}`,
      assetPair: `${asset}/USDC`,
      asset,
      type: "SELL",
      amount: asset === "BTC" ? 0.1 : asset === "ETH" ? 0.5 : 200,
      price: stSellPrice,
      priceUSD: stSellPrice,
      fee: stSellPrice * 0.002,
      feeUSD: stSellPrice * 0.002,
      timestamp: new Date(year, 11, 10).getTime(),
      currency: asset,
    });
  }

  return trades;
}
