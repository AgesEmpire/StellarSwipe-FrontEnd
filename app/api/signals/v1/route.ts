/**
 * @deprecated GET /api/signals/v1 is a compatibility shim.
 * Migrate to GET /api/signals which accepts `pageSize` instead of `limit`.
 */
import { NextResponse } from "next/server";
import { buildSignalPage } from "@/lib/signals";
import { traceWorker } from "@/src/tracing/worker-tracing.service";

/**
 * Scopes required to read the signals feed. API keys must carry all of these
 * for the request to be authorized at the service boundary.
 */
const REQUIRED_SCOPES = ["signals:read"] as const;

/**
 * Stable forbidden response returned whenever an API key is missing one or
 * more of the scopes required by this route.
 */
function forbiddenResponse(missingScopes: string[]) {
  return NextResponse.json(
    {
      error: "forbidden",
      message: "API key is missing required scopes.",
      missingScopes,
    },
    { status: 403 }
  );
}

/**
 * Stable unauthorized response returned whenever an API key is expired or
 * revoked. The message is intentionally generic so it never leaks whether a
 * key exists, its secret, or its lifecycle state.
 */
function unauthorizedResponse() {
  return NextResponse.json(
    {
      error: "unauthorized",
      message: "API key is invalid, expired, or revoked.",
    },
    { status: 401 }
  );
}

/**
 * Normalize the raw scope claim carried by the API key into a validated,
 * de-duplicated list. Accepts either a space-delimited string or an array.
 */
function normalizeScopes(raw: string | null): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(/[\s,]+/)
        .map((scope) => scope.trim())
        .filter((scope) => scope.length > 0)
    )
  );
}

/**
 * Parse a lifecycle timestamp header (e.g. `x-api-key-expires-at`). Returns
 * `null` when the header is absent or not a valid date.
 */
function parseTimestamp(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Determine whether the presented API key is still usable. A key is rejected
 * when it is explicitly revoked or when its expiry has passed. Keys without an
 * expiry header are treated as non-expiring.
 */
function isKeyUsable(request: Request, now: number): boolean {
  const revoked = request.headers.get("x-api-key-revoked");
  if (revoked && revoked.trim().toLowerCase() === "true") {
    return false;
  }

  const expiresAt = parseTimestamp(request.headers.get("x-api-key-expires-at"));
  if (expiresAt !== null && expiresAt <= now) {
    return false;
  }

  return true;
}

/**
 * Record last-used metadata for the authenticated key. Only non-secret
 * identifiers and a timestamp are surfaced; the key secret is never echoed.
 */
function lastUsedMetadata(request: Request, now: number) {
  return {
    keyId: request.headers.get("x-api-key-id") ?? null,
    lastUsedAt: new Date(now).toISOString(),
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const now = Date.now();

  // Enforce API key lifecycle (expiry + revocation) before doing any work.
  if (!isKeyUsable(request, now)) {
    return unauthorizedResponse();
  }

  // Enforce API key scopes before doing any work.
  const grantedScopes = normalizeScopes(request.headers.get("x-api-key-scopes"));
  const missingScopes = REQUIRED_SCOPES.filter(
    (scope) => !grantedScopes.includes(scope)
  );
  if (missingScopes.length > 0) {
    return forbiddenResponse(missingScopes);
  }

  // Legacy callers used `limit`; map it to `pageSize`
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(
    url.searchParams.get("limit") ?? url.searchParams.get("pageSize") ?? "10"
  );

  if (Number.isNaN(page) || page < 1 || Number.isNaN(pageSize) || pageSize < 1) {
    return NextResponse.json(
      { error: "Invalid pagination parameters." },
      { status: 400 }
    );
  }

  const feed = await traceWorker(
    "worker:signals:fetch",
    async () => buildSignalPage(page, pageSize),
    { page, pageSize, shimVersion: "v1" }
  );

  const lastUsed = lastUsedMetadata(request, now);

  return NextResponse.json(feed, {
    status: 200,
    headers: {
      Deprecation: "true",
      Link: '</api/signals>; rel="successor-version"',
      "X-Deprecation-Notice":
        "This endpoint is deprecated. Use /api/signals with pageSize instead of limit.",
      "X-API-Key-Last-Used-At": lastUsed.lastUsedAt,
    },
  });
}
