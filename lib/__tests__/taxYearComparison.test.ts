import { computeTaxReport, type TaxableTransaction } from "@/lib/taxUtils";
import {
  buildMultiYearSummaries,
  formatCoveredYears,
} from "../taxYearComparison";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const BASE = new Date(2025, 0, 15).getTime();

const TXS: TaxableTransaction[] = [
  {
    id: "tx-1",
    assetPair: "XLM/USDC",
    amount: 100,
    buyPrice: 0.4,
    sellPrice: 0.5,
    fee: 0.001,
    timestamp: BASE,
    acquisitionDate: BASE - 90 * MS_PER_DAY,
  },
  {
    id: "tx-2",
    assetPair: "AQUA/XLM",
    amount: 50,
    buyPrice: 1,
    sellPrice: 1.1,
    fee: 0.0002,
    timestamp: new Date(2024, 5, 1).getTime(),
    acquisitionDate: new Date(2023, 0, 1).getTime(),
  },
];

describe("buildMultiYearSummaries", () => {
  it("returns one summary per requested year", () => {
    const summaries = buildMultiYearSummaries(TXS, [2025, 2024], "US");
    expect(summaries).toHaveLength(2);
    expect(summaries.map((s) => s.year)).toEqual([2025, 2024]);
  });

  it("single-year selection matches computeTaxReport", () => {
    const [summary] = buildMultiYearSummaries(TXS, [2025], "US");
    const direct = computeTaxReport(TXS, 2025, "US");
    expect(summary.tradeCount).toBe(direct.entries.length);
    expect(summary.netGainLoss).toBeCloseTo(direct.totalGainLoss);
  });

  it("multi-year aggregates differ across years with different activity", () => {
    const summaries = buildMultiYearSummaries(TXS, [2025, 2024], "US");
    const y2025 = summaries.find((s) => s.year === 2025)!;
    const y2024 = summaries.find((s) => s.year === 2024)!;
    expect(y2025.tradeCount).toBe(1);
    expect(y2024.tradeCount).toBe(1);
    expect(y2025.netGainLoss).not.toBe(y2024.netGainLoss);
  });

  it("deduplicates year list", () => {
    const summaries = buildMultiYearSummaries(TXS, [2025, 2025, 2024], "US");
    expect(summaries).toHaveLength(2);
  });
});

describe("formatCoveredYears", () => {
  it("formats sorted unique years", () => {
    expect(formatCoveredYears([2025, 2023, 2024])).toBe("2023, 2024, 2025");
  });

  it("returns empty string for empty input", () => {
    expect(formatCoveredYears([])).toBe("");
  });
});
