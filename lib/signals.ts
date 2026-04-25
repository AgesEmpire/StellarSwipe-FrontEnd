export type SignalAction = "BUY" | "SELL" | "HOLD";

export interface Signal {
  id: string;
  ticker: string;
  action: SignalAction;
  confidence: number;
  details: string;
  timestamp: string;
}

export interface SignalFeedPage {
  items: Signal[];
  page: number;
  pageSize: number;
  total: number;
  nextPage: number | null;
  hasMore: boolean;
}

const signalTickers = ["XLM", "BTC", "ETH", "USDC", "ADA", "SOL", "DOT", "MATIC", "ATOM", "LUNA"];
const signalActions: SignalAction[] = ["BUY", "SELL", "HOLD"];
const signalDetails = [
  "Momentum building after a strong volume breakout.",
  "Price action suggests a reversal setup near support.",
  "Short-term indicators are aligned for a bullish move.",
  "Order flow shows growing demand on the bid side.",
  "Volatility contraction signals a potential breakout soon.",
  "Watch for a clean pullback into a high-probability zone.",
  "Liquidity is clustering around the current range.",
  "Trend strength remains intact on the higher time frame.",
  "A measured move target is shaping up on the chart.",
  "Market depth suggests a balanced buy/sell interest.",
];

const TOTAL_SIGNALS = 50;

export function buildSignalPage(page = 1, pageSize = 10): SignalFeedPage {
  const allSignals: Signal[] = Array.from({ length: TOTAL_SIGNALS }, (_, index) => {
    const ticker = signalTickers[index % signalTickers.length];
    const action = signalActions[index % signalActions.length];
    const details = signalDetails[index % signalDetails.length];
    const confidence = 60 + ((index * 7) % 40);
    const timestamp = new Date(Date.now() - index * 7 * 60 * 1000).toISOString();

    return {
      id: `signal-${index + 1}`,
      ticker,
      action,
      confidence,
      details,
      timestamp,
    };
  });

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const items = allSignals.slice(start, end);
  const hasMore = end < TOTAL_SIGNALS;

  return {
    items,
    page,
    pageSize,
    total: TOTAL_SIGNALS,
    nextPage: hasMore ? page + 1 : null,
    hasMore,
  };
}
