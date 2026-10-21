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
 * Header names whose values must never appear in logs. Matched
 * case-insensitively against the raw header name.
 */
const SENSITIVE_HEADERS = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-api-key-secret",
  "x-api-key-scopes",
  "x-signature",
  "x-hub-signature",
  "x-hub-signature-256",
  "x-request-signature",
]);

/**
 * Query parameter names whose values must never appear in logs.
 */
const SENSITIVE_QUERY_PARAMS = new Set([
  "api_key",
  "apikey",
  "access_token",
  "token",
  "signature",
  "sig",
  "secret",
  "password",
]);

const REDACTED = "[REDACTED]";

/**
 * Redact a header map, replacing any sensitive header value with a stable
 * placeholder. Header names are preserved so logs stay searchable.
 */
function redactHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, name) => {
    out[name] = SENSITIVE_HEADERS.has(name.toLowerCase()) ? REDACTED : value;
  });
  return out;
}

/**
 * Redact sensitive query parameters, preserving the rest of the query string
 * so route-level debugging remains possible.
 */
function redactQuery(url: URL): Record<string, string> {
  const out: Record<string, string> = {};
  url.searchParams.forEach((value, name) => {
    out[name] = SENSITIVE_QUERY_PARAMS.has(name.toLowerCase())
      ? REDACTED
      : value;
  });
  return out;
}

/**
 * Emit a single structured (JSON) request log line. Includes route, status,
 * latency, and correlation ID, with sensitive fields redacted.
 */
function logRequest(entry: {
  request: Request;
  route: string;
  status: number;
  startedAt: number;
  correlationId: string;
}) {
  const { request, route, status, startedAt, correlationId } = entry;
  const url = new URL(request.url);
  const latencyMs = Date.now() - startedAt;

  const record = {
    type: "request",
    route,
    method: request.method,
    path: url.pathname,
    status,
    latencyMs,
    correlationId,
    query: redactQuery(url),
    headers: redactHeaders(request.headers),
  };

  // Structured, single-line JSON so log aggregators can parse it.
  console.log(JSON.stringify(record));
}

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

/**
 * Resolve the correlation ID for a request, honoring an inbound header when
 * present and otherwise generating a fresh one.
 */
function resolveCorrelationId(request: Request): string {
  return (
    request.headers.get("x-correlation-id") ??
    request.headers.get("x-request-id") ??
    crypto.randomUUID()
  );
}

export async function GET(request: Request) {
  const startedAt = Date.now();
  const correlationId = resolveCorrelationId(request);
  const route = "/api/signals/v1";

  const respond = (response: NextResponse) => {
    response.headers.set("X-Correlation-Id", correlationId);
    logRequest({
      request,
      route,
      status: response.status,
      startedAt,
      correlationId,
    });
    return response;
  };

  const url = new URL(request.url);
  const now = Date.now();

  // Enforce API key lifecycle (expiry + revocation) before doing any work.
  if (!isKeyUsable(request, now)) {
    return respond(unauthorizedResponse());
  }

  // Enforce API key scopes before doing any work.
  const grantedScopes = normalizeScopes(request.headers.get("x-api-key-scopes"));
  const missingScopes = REQUIRED_SCOPES.filter(
    (scope) => !grantedScopes.includes(scope)
  );
  if (missingScopes.length > 0) {
    return respond(forbiddenResponse(missingScopes));
  }

  // Legacy callers used `limit`; map it to `pageSize`
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(
    url.searchParams.get("limit") ?? url.searchParams.get("pageSize") ?? "10"
  );

  if (Number.isNaN(page) || page < 1 || Number.isNaN(pageSize) || pageSize < 1) {
    return respond(
      NextResponse.json(
        { error: "Invalid pagination parameters." },
        { status: 400 }
      )
    );
  }

  const feed = await traceWorker(
    "worker:signals:fetch",
    async () => buildSignalPage(page, pageSize),
    { page, pageSize, shimVersion: "v1" }
  );

  const lastUsed = lastUsedMetadata(request, now);

  return respond(
    NextResponse.json(feed, {
      status: 200,
      headers: {
        Deprecation: "true",
        Link: '</api/signals>; rel="successor-version"',
        "X-Deprecation-Notice":
          "This endpoint is deprecated. Use /api/signals with pageSize instead of limit.",
        "X-API-Key-Last-Used-At": lastUsed.lastUsedAt,
      },
    })
  );
}
