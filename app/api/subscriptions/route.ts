import { NextRequest, NextResponse } from "next/server";
import {
  parseSubscriptionStatus,
  SubscriptionStatus,
} from "@/lib/subscriptionStatus";

type StoredOutcome = {
  fingerprint: string;
  status: number;
  body: unknown;
  expiresAt: number;
};

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const idempotencyStore = new Map<string, StoredOutcome>();

function principalFrom(req: NextRequest): string {
  return (
    req.headers.get("x-user-id") ??
    req.headers.get("authorization") ??
    "anonymous"
  );
}

function scopedKey(principal: string, key: string): string {
  return `${principal}::${key}`;
}

function fingerprint(payload: unknown): string {
  return JSON.stringify(payload ?? null);
}

function pruneExpired(now: number) {
  for (const [key, entry] of idempotencyStore) {
    if (entry.expiresAt <= now) idempotencyStore.delete(key);
  }
}

export async function GET(req: NextRequest) {
  const rawStatus = req.nextUrl.searchParams.get("status");

  if (rawStatus === null) {
    return NextResponse.json(
      { subscriptions: await fetchSubscriptions() },
      { status: 200 }
    );
  }

  const status = parseSubscriptionStatus(rawStatus);

  if (!status) {
    return NextResponse.json(
      {
        error: `Invalid status "${rawStatus}". Valid values: ${Object.values(
          SubscriptionStatus
        ).join(", ")}`,
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { subscriptions: await fetchSubscriptions(status) },
    { status: 200 }
  );
}

export async function POST(req: NextRequest) {
  const idempotencyKey = req.headers.get("idempotency-key");
  const principal = principalFrom(req);

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const now = Date.now();
  pruneExpired(now);

  if (idempotencyKey) {
    const key = scopedKey(principal, idempotencyKey);
    const existing = idempotencyStore.get(key);

    if (existing && existing.expiresAt > now) {
      if (existing.fingerprint !== fingerprint(payload)) {
        return NextResponse.json(
          { error: "Idempotency key reused with a different payload" },
          { status: 409 }
        );
      }
      return NextResponse.json(existing.body, { status: existing.status });
    }
  }

  const body = { subscription: await createSubscription(payload) };
  const status = 201;

  if (idempotencyKey) {
    idempotencyStore.set(scopedKey(principal, idempotencyKey), {
      fingerprint: fingerprint(payload),
      status,
      body,
      expiresAt: now + IDEMPOTENCY_TTL_MS,
    });
  }

  return NextResponse.json(body, { status });
}

// Replace with real data source (DB / Soroban contract call)
async function fetchSubscriptions(status?: SubscriptionStatus) {
  const mock = [
    { id: "1", status: SubscriptionStatus.Active },
    { id: "2", status: SubscriptionStatus.Expired },
    { id: "3", status: SubscriptionStatus.Pending },
  ];
  return status ? mock.filter((s) => s.status === status) : mock;
}

// Replace with real data source (DB / Soroban contract call)
async function createSubscription(payload: unknown) {
  return { id: String(Date.now()), payload };
}
