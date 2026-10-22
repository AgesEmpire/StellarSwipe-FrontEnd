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

function isAuthorized(roles: string[]): boolean {
  return roles.some((role) =>
    (ADMIN_ROLES as readonly string[]).includes(role)
  );
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
