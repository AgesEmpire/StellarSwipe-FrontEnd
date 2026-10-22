import { NextResponse } from "next/server";
import { validateSignalPayload } from "@/lib/signalPayload";

/**
 * POST /api/signals/publish
 *
 * Administrative endpoint. Publishing provider signals is restricted to
 * trusted identities carrying an administrative role. Roles are derived
 * from server-side identity data (never from client-supplied input) and
 * authorization is deny-by-default: any request without a recognized
 * admin role is rejected.
 *
 * Accepts a provider signal payload, validates all required fields, and
 * returns the normalized signal on success. Invalid payloads are rejected
 * with HTTP 422 and a structured errors array — no partial record is
 * created.
 *
 * Idempotency: mutating requests may supply an `Idempotency-Key` header.
 * Keys are scoped to the authenticated principal so keys from different
 * users cannot collide. A matching repeat returns the stored outcome; the
 * same key reused with a different payload returns HTTP 409.
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

const ADMIN_ROLES = ["admin", "signals:publish"] as const;

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

interface StoredOutcome {
  fingerprint: string;
  status: number;
  body: unknown;
  expiresAt: number;
}

/**
 * In-memory idempotency store keyed by `${principalId}:${idempotencyKey}`.
 * Scoping to the principal prevents cross-user key collisions. Entries
 * expire after IDEMPOTENCY_TTL_MS.
 */
const idempotencyStore = new Map<string, StoredOutcome>();

function pruneExpired(now: number): void {
  for (const [key, entry] of idempotencyStore) {
    if (entry.expiresAt <= now) {
      idempotencyStore.delete(key);
    }
  }
}

/**
 * Resolve the caller's roles from trusted server-side identity data.
 *
 * Roles are read from the authenticated principal attached to the request
 * by the auth layer (e.g. a verified session/JWT), never from the request
 * body, query string, or other client-controlled headers. Returns an empty
 * array when no trusted identity is present so that authorization fails
 * closed.
 */
function getTrustedRoles(request: Request): string[] {
  const principal = (request as Request & {
    auth?: { roles?: unknown };
  }).auth;

  const roles = principal?.roles;

  if (!Array.isArray(roles)) {
    return [];
  }

  return roles.filter((role): role is string => typeof role === "string");
}

/**
 * Resolve the authenticated principal id from trusted server-side identity
 * data. Returns null when no trusted identity is present.
 */
function getPrincipalId(request: Request): string | null {
  const principal = (request as Request & {
    auth?: { id?: unknown; sub?: unknown };
  }).auth;

  const id = principal?.id ?? principal?.sub;

  return typeof id === "string" && id.length > 0 ? id : null;
}

function isAuthorized(roles: string[]): boolean {
  return roles.some((role) =>
    (ADMIN_ROLES as readonly string[]).includes(role)
  );
}

function fingerprint(body: unknown): string {
  return JSON.stringify(body);
}

export async function POST(request: Request) {
  const roles = getTrustedRoles(request);

  if (roles.length === 0) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  if (!isAuthorized(roles)) {
    return NextResponse.json(
      { error: "Forbidden: administrative role required." },
      { status: 403 }
    );
  }

  const principalId = getPrincipalId(request);

  if (!principalId) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const idempotencyKey = request.headers.get("Idempotency-Key");
  const now = Date.now();

  if (idempotencyKey) {
    pruneExpired(now);

    const scopedKey = `${principalId}:${idempotencyKey}`;
    const existing = idempotencyStore.get(scopedKey);
    const requestFingerprint = fingerprint(body);

    if (existing) {
      if (existing.fingerprint !== requestFingerprint) {
        return NextResponse.json(
          {
            error:
              "Idempotency-Key was reused with a different request payload.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(existing.body, { status: existing.status });
    }

    const result = validateSignalPayload(body);

    if (!result.success) {
      return NextResponse.json(
        { errors: result.errors },
        { status: 422 }
      );
    }

    const responseBody = { signal: result.data };

    idempotencyStore.set(scopedKey, {
      fingerprint: requestFingerprint,
      status: 201,
      body: responseBody,
      expiresAt: now + IDEMPOTENCY_TTL_MS,
    });

    return NextResponse.json(responseBody, { status: 201 });
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
