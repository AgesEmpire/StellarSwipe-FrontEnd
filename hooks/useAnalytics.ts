import { useQuery } from "@tanstack/react-query";
import { usePortfolioStore } from "@/store/usePortfolioStore";

export interface PortfolioDataPoint {
  date: string;
  value: number;
}

export interface TradeRecord {
  id: string;
  asset: string;
  direction: "BUY" | "SELL";
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
  providerId: string;
  providerName: string;
  openedAt: string;
  closedAt: string;
  outcome: "WIN" | "LOSS";
}

export interface ProviderAttribution {
  providerId: string;
  providerName: string;
  totalPnl: number;
  winRate: number;
  tradeCount: number;
  contribution: number; // percent of total pnl
}

export interface MonthlyReturn {
  year: number;
  month: number; // 0-indexed
  returnPercent: number;
}

export interface AnalyticsData {
  portfolioHistory: PortfolioDataPoint[];
  trades: TradeRecord[];
  providerAttribution: ProviderAttribution[];
  monthlyReturns: MonthlyReturn[];
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownRecoveryDays: number;
  winRate: number;
  totalReturn: number;
  totalReturnPercent: number;
  bestTrade: TradeRecord | null;
  worstTrade: TradeRecord | null;
  avgWin: number;
  avgLoss: number;
  correlationMatrix: { assetA: string; assetB: string; correlation: number }[];
}

// ── Mock data ─────────────────────────────────────────────────────────────────

function generatePortfolioHistory(days: number): PortfolioDataPoint[] {
  const points: PortfolioDataPoint[] = [];
  let value = 2500;
  const now = Date.now();
  for (let i = days; i >= 0; i--) {
    const date = new Date(now - i * 86_400_000);
    value = value * (1 + (Math.random() - 0.46) * 0.03);
    points.push({ date: date.toISOString().slice(0, 10), value: Math.round(value * 100) / 100 });
  }
  return points;
}

const MOCK_TRADES: TradeRecord[] = [
  { id: "t1",  asset: "XLM",   direction: "BUY",  entryPrice: 0.42, exitPrice: 0.51, pnl: 214,   pnlPercent: 21.4, providerId: "p1", providerName: "AlphaTrader",   openedAt: "2026-04-01T09:00:00Z", closedAt: "2026-04-08T14:00:00Z", outcome: "WIN" },
  { id: "t2",  asset: "BTC",   direction: "BUY",  entryPrice: 62000, exitPrice: 58000, pnl: -400, pnlPercent: -6.5, providerId: "p2", providerName: "SignalMaster",  openedAt: "2026-04-10T10:00:00Z", closedAt: "2026-04-15T11:00:00Z", outcome: "LOSS" },
  { id: "t3",  asset: "ETH",   direction: "SELL", entryPrice: 3200, exitPrice: 2900, pnl: 300,   pnlPercent: 9.4,  providerId: "p1", providerName: "AlphaTrader",   openedAt: "2026-04-12T08:00:00Z", closedAt: "2026-04-20T16:00:00Z", outcome: "WIN" },
  { id: "t4",  asset: "SOL",   direction: "BUY",  entryPrice: 145,  exitPrice: 168,  pnl: 230,   pnlPercent: 15.9, providerId: "p3", providerName: "TrendFollower", openedAt: "2026-04-18T12:00:00Z", closedAt: "2026-04-25T09:00:00Z", outcome: "WIN" },
  { id: "t5",  asset: "ADA",   direction: "BUY",  entryPrice: 0.48, exitPrice: 0.44, pnl: -83,   pnlPercent: -8.3, providerId: "p2", providerName: "SignalMaster",  openedAt: "2026-04-22T14:00:00Z", closedAt: "2026-04-28T10:00:00Z", outcome: "LOSS" },
  { id: "t6",  asset: "XLM",   direction: "SELL", entryPrice: 0.55, exitPrice: 0.48, pnl: 127,   pnlPercent: 12.7, providerId: "p1", providerName: "AlphaTrader",   openedAt: "2026-05-01T09:00:00Z", closedAt: "2026-05-06T15:00:00Z", outcome: "WIN" },
  { id: "t7",  asset: "MATIC", direction: "BUY",  entryPrice: 0.72, exitPrice: 0.91, pnl: 264,   pnlPercent: 26.4, providerId: "p3", providerName: "TrendFollower", openedAt: "2026-05-05T11:00:00Z", closedAt: "2026-05-14T13:00:00Z", outcome: "WIN" },
  { id: "t8",  asset: "DOT",   direction: "BUY",  entryPrice: 7.2,  exitPrice: 6.5,  pnl: -97,   pnlPercent: -9.7, providerId: "p4", providerName: "ProSignals",    openedAt: "2026-05-10T08:00:00Z", closedAt: "2026-05-18T10:00:00Z", outcome: "LOSS" },
  { id: "t9",  asset: "ETH",   direction: "BUY",  entryPrice: 2850, exitPrice: 3100, pnl: 250,   pnlPercent: 8.8,  providerId: "p1", providerName: "AlphaTrader",   openedAt: "2026-05-15T10:00:00Z", closedAt: "2026-05-22T14:00:00Z", outcome: "WIN" },
  { id: "t10", asset: "BTC",   direction: "SELL", entryPrice: 65000, exitPrice: 61000, pnl: 400, pnlPercent: 6.2,  providerId: "p2", providerName: "SignalMaster",  openedAt: "2026-05-20T09:00:00Z", closedAt: "2026-05-28T11:00:00Z", outcome: "WIN" },
];

const MOCK_MONTHLY_RETURNS: MonthlyReturn[] = [
  { year: 2025, month: 11, returnPercent: 4.2 },
  { year: 2026, month: 0,  returnPercent: -1.8 },
  { year: 2026, month: 1,  returnPercent: 7.3 },
  { year: 2026, month: 2,  returnPercent: 2.1 },
  { year: 2026, month: 3,  returnPercent: 11.4 },
  { year: 2026, month: 4,  returnPercent: 6.8 },
];

function computeProviderAttribution(trades: TradeRecord[]): ProviderAttribution[] {
  const map = new Map<string, ProviderAttribution>();
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  for (const t of trades) {
    const existing = map.get(t.providerId);
    if (existing) {
      existing.totalPnl += t.pnl;
      existing.tradeCount += 1;
      if (t.outcome === "WIN") existing.winRate = (existing.winRate * (existing.tradeCount - 1) + 100) / existing.tradeCount;
    } else {
      map.set(t.providerId, {
        providerId: t.providerId,
        providerName: t.providerName,
        totalPnl: t.pnl,
        winRate: t.outcome === "WIN" ? 100 : 0,
        tradeCount: 1,
        contribution: 0,
      });
    }
  }
  const result = Array.from(map.values());
  for (const r of result) {
    r.contribution = totalPnl !== 0 ? (r.totalPnl / Math.abs(totalPnl)) * 100 : 0;
  }
  return result.sort((a, b) => b.totalPnl - a.totalPnl);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export type TimeRange = "1D" | "1W" | "1M" | "1Y";

const RANGE_DAYS: Record<TimeRange, number> = { "1D": 1, "1W": 7, "1M": 30, "1Y": 365 };

export function useAnalytics(range: TimeRange = "1M") {
  const { totalValue } = usePortfolioStore();

  return useQuery<AnalyticsData>({
    queryKey: ["analytics", range],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 700));
      const days = RANGE_DAYS[range];
      const portfolioHistory = generatePortfolioHistory(days);
      const trades = MOCK_TRADES;
      const wins = trades.filter((t) => t.outcome === "WIN");
      const losses = trades.filter((t) => t.outcome === "LOSS");
      const totalReturn = trades.reduce((s, t) => s + t.pnl, 0);
      const startValue = portfolioHistory[0]?.value ?? totalValue;
      const endValue = portfolioHistory[portfolioHistory.length - 1]?.value ?? totalValue;
      const totalReturnPercent = startValue > 0 ? ((endValue - startValue) / startValue) * 100 : 0;

      // Drawdown
      let peak = portfolioHistory[0]?.value ?? 0;
      let maxDrawdown = 0;
      for (const p of portfolioHistory) {
        if (p.value > peak) peak = p.value;
        const dd = peak > 0 ? ((peak - p.value) / peak) * 100 : 0;
        if (dd > maxDrawdown) maxDrawdown = dd;
      }

      const sortedByPnl = [...trades].sort((a, b) => b.pnl - a.pnl);

      return {
        portfolioHistory,
        trades,
        providerAttribution: computeProviderAttribution(trades),
        monthlyReturns: MOCK_MONTHLY_RETURNS,
        sharpeRatio: 1.42,
        maxDrawdown: Math.round(maxDrawdown * 100) / 100,
        maxDrawdownRecoveryDays: 8,
        winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
        totalReturn,
        totalReturnPercent,
        bestTrade: sortedByPnl[0] ?? null,
        worstTrade: sortedByPnl[sortedByPnl.length - 1] ?? null,
        avgWin: wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0,
        avgLoss: losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0,
        correlationMatrix: [
          { assetA: "XLM", assetB: "BTC",   correlation: 0.72 },
          { assetA: "XLM", assetB: "ETH",   correlation: 0.68 },
          { assetA: "BTC", assetB: "ETH",   correlation: 0.91 },
          { assetA: "SOL", assetB: "BTC",   correlation: 0.65 },
          { assetA: "ADA", assetB: "XLM",   correlation: 0.58 },
          { assetA: "MATIC", assetB: "ETH", correlation: 0.74 },
        ],
      };
    },
    staleTime: 120_000,
  });
}
