import { NextResponse } from "next/server";
import { buildSignalPage } from "@/lib/signals";
import { traceWorker } from "@/src/tracing/worker-tracing.service";
import { validateSignalPayload } from "@/lib/signalPayload";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "10");

  if (Number.isNaN(page) || page < 1 || Number.isNaN(pageSize) || pageSize < 1) {
    return NextResponse.json(
      { error: "Invalid pagination parameters. page and pageSize must be positive integers." },
      { status: 400 }
    );
  }

  const feed = await traceWorker(
    "worker:signals:fetch",
    async () => buildSignalPage(page, pageSize),
    { page, pageSize }
  );

  return NextResponse.json(feed, { status: 200 });
}

/**
 * POST /api/signals
 *
 * Accepts a provider signal payload, validates all required fields, and
 * returns the normalized signal on success. Invalid payloads are rejected
 * with HTTP 422 and a list of validation errors — no partial record is
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
