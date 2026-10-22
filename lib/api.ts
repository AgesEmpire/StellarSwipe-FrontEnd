export class NetworkError extends Error {
  constructor() {
    super("Network error — check your connection and try again.");
    this.name = "NetworkError";
  }
}

export class ServerError extends Error {
  constructor(public status: number) {
    super(`Server error (${status}) — please try again later.`);
    this.name = "ServerError";
  }
}

export interface SignalStats {
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  riskReward: string;
}

export interface Signal {
  id: string;
  asset: string;
  action: "BUY" | "SELL";
  confidence: number;
  timestamp: string;
  rationale?: string;
  stats?: SignalStats;
  providerId?: string;
  providerName?: string;
  /** ISO timestamp of the last revision/update to this signal */
  lastUpdated?: string;
  /** Whether this signal has been updated since initial publication */
  hasRevision?: boolean;
}

export async function fetchSignals(): Promise<Signal[]> {
  let res: Response;
  try {
    res = await fetch("/api/signals");
  } catch {
    throw new NetworkError();
  }

  if (!res.ok) throw new ServerError(res.status);
  return res.json();
}
