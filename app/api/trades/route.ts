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
 * POST /api/trades
 * Revalidates trade limits before the client may submit a transaction.
 * Nothing is submitted here; a 2xx response only means the order may proceed.
 * The response also carries estimated post-trade balances for the review step.
 *
 * When the client sends the account the review was created for
 * (`reviewedPublicKey`), a mismatch with the active `publicKey` means the
 * wallet changed mid-review: the review is invalidated and signing is
 * refused until the user deliberately reviews again.
 */
export async function POST(req: NextRequest) {
  const parsed = tradeRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return rejectResponse(
      rejectTrade(TRADE_ERROR_CODES.INVALID_REQUEST, "Malformed trade request.")
    );
  }

  const order = parsed.data;

  // Guard: the active account must match the account the review was built for.
  const reviewedPublicKey = (order as { reviewedPublicKey?: unknown }).reviewedPublicKey;
  if (typeof reviewedPublicKey === "string" && reviewedPublicKey !== order.publicKey) {
    return NextResponse.json(
      {
        code: TRADE_ERROR_CODES.ACCOUNT_CHANGED,
        message:
          "Your active wallet changed since this review was created. Review the trade again before signing.",
        accountChanged: true,
        activePublicKey: order.publicKey,
        reviewedPublicKey,
      },
      { status: 409 }
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

  return NextResponse.json(
    { ok: true, preview: buildBalancePreview(order, availableBalance) },
    { status: 200 }
  );
}

/**
 * Estimates before-and-after balances for the review step.
 * Uses the quoted amount and displayed fees; missing inputs are labeled.
 */
function buildBalancePreview(
  order: { side: "buy" | "sell"; amount: number; price?: number; fee?: number },
  availableBalance: number
) {
  const fee = typeof order.fee === "number" && Number.isFinite(order.fee) ? order.fee : null;
  const price = typeof order.price === "number" && Number.isFinite(order.price) ? order.price : null;
  const amount = Number.isFinite(order.amount) ? order.amount : null;

  const quoteComplete = amount !== null && price !== null;
  const feeKnown = fee !== null;

  const before = availableBalance;
  let after: number | null = null;

  if (quoteComplete) {
    const notional = amount * price;
    const feeAmount = feeKnown ? fee : 0;
    after = order.side === "buy" ? before - notional - feeAmount : before + notional - feeAmount;
  }

  return {
    asset: "native",
    before,
    after,
    // Label unavailable inputs so the UI can render them as estimates.
    estimated: !quoteComplete || !feeKnown,
    quoteComplete,
    feeKnown,
    fee: feeKnown ? fee : null,
    unavailable: after === null ? ["after"] : [],
  };
}

function rejectResponse({ code, message, status }: TradeRejection) {
  return NextResponse.json({ code, message }, { status });
}

