import { NextRequest, NextResponse } from "next/server";
import { getAccountBalances } from "@/lib/stellar";
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
 * Explicit CORS origin allowlist, sourced from validated configuration.
 * Comma-separated list of frontend origins (e.g. "https://app.example.com").
 * Wildcard ("*") entries are rejected because credentialed requests must
 * never be answered with an arbitrary origin.
 */
const ALLOWED_ORIGINS: readonly string[] = (
  process.env.CORS_ALLOWED_ORIGINS ?? ""
)
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0 && origin !== "*");

/** Methods and headers the API intends to accept on preflight. */
const ALLOWED_METHODS = "POST, OPTIONS";
const ALLOWED_HEADERS = "Content-Type, Authorization";

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Vary: "Origin",
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  return headers;
}

/**
 * OPTIONS /api/trades
 * Answers CORS preflight, allowing only intended methods and headers and
 * only for origins present in the configured allowlist.
 */
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return new NextResponse(null, { status: 403, headers: corsHeaders(null) });
  }
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

/**
 * POST /api/trades
 * Revalidates trade limits before the client may submit a transaction.
 * Nothing is submitted here; a 2xx response only means the order may proceed.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  const parsed = tradeRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return rejectResponse(
      rejectTrade(TRADE_ERROR_CODES.INVALID_REQUEST, "Malformed trade request."),
      headers
    );
  }

  const order = parsed.data;
  const limitRejection = checkTradeLimits(order, APP_NETWORK);
  if (limitRejection) return rejectResponse(limitRejection, headers);

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
      ),
      headers
    );
  }

  const balanceRejection = checkAvailableBalance(order, availableBalance);
  if (balanceRejection) return rejectResponse(balanceRejection, headers);

  return NextResponse.json({ ok: true }, { status: 200, headers });
}

function rejectResponse(
  { code, message, status }: TradeRejection,
  headers: Record<string, string>
) {
  return NextResponse.json({ code, message }, { status, headers });
}
