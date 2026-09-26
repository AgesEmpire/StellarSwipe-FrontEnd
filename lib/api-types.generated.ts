/**
 * AUTO-GENERATED — do not edit by hand.
 * Re-generate with: npm run api:generate
 * Source: openapi.yaml
 */

export type SignalAction = "BUY" | "SELL" | "HOLD";

export type SignalStatus = "Active" | "Waiting" | "Closed";

export interface Signal {
  id: string;
  ticker: string;
  action: SignalAction;
  /** 0–100 */
  confidence: number;
  details: string;
  /** ISO 8601 date-time */
  timestamp: string;
  /** ISO 8601 date-time — when this signal expires */
  expiresAt?: string;
  provider?: string;
  status?: SignalStatus;
}

export interface SignalFeedPage {
  items: Signal[];
  page: number;
  pageSize: number;
  total: number;
  nextPage: number | null;
  hasMore: boolean;
}

export type SubscriptionStatus =
  | "active"
  | "inactive"
  | "pending"
  | "cancelled"
  | "expired";

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
}

export interface SubscriptionsResponse {
  subscriptions: Subscription[];
}

export interface ErrorResponse {
  error: string;
}

/** Query parameters accepted by GET /api/signals */
export interface GetSignalsParams {
  page?: number;
  pageSize?: number;
}

/** Query parameters accepted by GET /api/subscriptions */
export interface GetSubscriptionsParams {
  status?: SubscriptionStatus;
}
