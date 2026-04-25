export interface Signal {
  id: string;
  asset: string;
  pair: string;
  direction: "BUY" | "SELL" | "NEUTRAL";
  confidence: number; // 0–100
  price: string;
  timestamp: string;
  analysis: string; // technical analysis copy — can be long
  tags?: string[];
}
