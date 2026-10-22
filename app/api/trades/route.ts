import { NextRequest, NextResponse } from "next/server";
import { getAccountBalances } from "@/lib/stellar";
import { withRequestLogging } from "@/lib/requestLogging";
import {
  TRADE_ERROR_CODES,
  checkAvailableBalance,
  checkTradeLimits,
  rejectTrade,
  tradeRequestSchema,
  type TradeRejection,
} from "@/lib/tradeLimits";

/** The Stellar network the app expects. Matches NetworkMismatchBanner. */
const APP_NETWORK: string = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "TESTNET";

/**
 * Rate limit configuration for the trades endpoint group.
 * Limits and windows are configurable via environment variables.
 */
const TRADES_RATE_LIMIT = {
  /** Max requests per authenticated account within the window. */
  userLimit: Number(process.env.TRADES_RATE_LIMIT_USER ?? 30),
  /** Max requests per IP (unauthenticated or fallback) within the window. */
  ipLimit: Number(process.env.TRADES_RATE_LIMIT_IP ?? 10),
  /** Window length in milliseconds. */
  windowMs: Number(process.env.TRADES_RATE_LIMIT_WINDOW_MS ?? 60_000),
};

interface RateBucket {
  count: number;
  resetAt: number;
}

/** In-memory buckets keyed by identity (account or IP). */
const rateBuckets = new Map<string, RateBucket>();

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Resolve the throttling identity: authenticated account when available,
 * otherwise fall back to the client IP.
 */
function resolveIdentity(req: NextRequest, account?: string): { key: string; limit: number } {
  if (account) {
    return { key: `user:${account}`, limit: TRADES_RATE_LIMIT.userLimit };
  }
  return { key: `ip:${getClientIp(req)}`, limit: TRADES_RATE_LIMIT.ipLimit };
}

function checkRateLimit(
  req: NextRequest,
  account?: string
): { allowed: true } | { allowed: false; retryAfter: number } {
  const { key, limit } = resolveIdentity(req, account);
  const now = Date.now();
  const bucket = rateBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + TRADES_RATE_LIMIT.windowMs });
    return { allowed: true };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true };
}

/**
 * POST /api/trades
 * Revalidates trade limits before the client may submit a transaction.
 * Nothing is submitted here; a 2xx response only means the order may proceed.
 *
 * Metrics are emitted by withRequestLogging using the bounded route template
 * ("/api/trades") and HTTP status only — never wallet addresses or payloads.
 */
export const POST = withRequestLogging("/api/trades", async (req: NextRequest) => {
  const parsed = tradeRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return rejectResponse(
      rejectTrade(TRADE_ERROR_CODES.INVALID_REQUEST, "Malformed trade request.")
    );
  }

  const order = parsed.data;

  // Throttle by account identity, falling back to IP when no account is present.
  const rate = checkRateLimit(req, order.publicKey);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        code: "RATE_LIMITED",
        message: "Too many requests. Please retry after the indicated delay.",
        retryAfter: rate.retryAfter,
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } }
    );
  }

  const limitRejection = checkTradeLimits(order, APP_NETWORK);
  if (limitRejection) return rejectResponse(limitRejection);

  // Read the balance from the chain at execution time, never from the client.
  let availableBalance: number;
  try {
    const balances = await getAccountBalances(order.publicKey);
    const native = balances.find((b) => b.asset_type === "native");
    availableBalance = parseFloat(native?.balance ?? "0");
  } catch {
    return rejectResponse(
      rejectTrade(
        TRADE_ERROR_CODES.BALANCE_UNAVAILABLE,
        "Could not verify your balance. Please try again."
      )
    );
  }

  const balanceRejection = checkAvailableBalance(order, availableBalance);
  if (balanceRejection) return rejectResponse(balanceRejection);

  return NextResponse.json({ ok: true }, { status: 200 });
});

function rejectResponse({ code, message, status }: TradeRejection) {
  return NextResponse.json({ code, message }, { status });
}
