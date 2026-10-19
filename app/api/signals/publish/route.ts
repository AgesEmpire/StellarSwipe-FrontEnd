import { NextResponse } from "next/server";
import { validateSignalPayload } from "@/lib/signalPayload";

/**
 * POST /api/signals/publish
 *
 * Accepts a provider signal payload, validates all required fields, and
 * returns the normalized signal on success. Invalid payloads are rejected
 * with HTTP 422 and a structured errors array — no partial record is
 * created.
 *
 * Expected body (JSON):
 *   {
 *     asset:     string   — e.g. "XLM/USDC"
 *     direction: "BUY" | "SELL"
 *     entry:     number   — positive entry price
 *     risk:      number   — 0 < risk ≤ 100
 *     expiry:    string   — future ISO 8601 datetime
 *   }
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const result = validateSignalPayload(body);

  if (!result.success) {
    return NextResponse.json(
      { errors: result.errors },
      { status: 422 }
    );
  }

  return NextResponse.json(
    { signal: result.data },
    { status: 201 }
  );
}
