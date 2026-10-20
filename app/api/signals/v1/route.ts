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

export async function GET(request: Request) {
  const url = new URL(request.url);

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

  return NextResponse.json(feed, {
    status: 200,
    headers: {
      Deprecation: "true",
      Link: '</api/signals>; rel="successor-version"',
      "X-Deprecation-Notice":
        "This endpoint is deprecated. Use /api/signals with pageSize instead of limit.",
    },
  });
}
