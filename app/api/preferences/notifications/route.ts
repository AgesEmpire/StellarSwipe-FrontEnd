import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/providerFollows";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  validateNotificationPreferences,
} from "@/lib/notificationPreferences";

/**
 * Builds a consistent API error envelope: a stable machine-readable `code`, a
 * safe human-readable `message`, and the `requestId` for correlation. Internal
 * details (stack traces, secrets) are never included.
 */
function errorResponse(
  request: Request,
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>
) {
  const requestId =
    request.headers.get("x-request-id") ??
    request.headers.get("x-correlation-id") ??
    crypto.randomUUID();

  return NextResponse.json(
    { error: { code, message, requestId, ...extra } },
    { status, headers: { "x-request-id": requestId } }
  );
}

/**
 * GET /api/preferences/notifications
 *
 * Returns the authenticated user's notification preferences (channel
 * enablement, time zone, quiet-hour windows). Users without saved
 * preferences receive the defaults.
 *
 * The response is scoped to the authenticated user and includes the schema
 * `version` so clients can migrate older payloads. Unknown fields are never
 * persisted (see PUT).
 */
export async function GET(request: Request) {
  const userId = getRequestUserId(request);

  if (!userId) {
    return errorResponse(
      request,
      401,
      "UNAUTHENTICATED",
      "Authentication required"
    );
  }

  return NextResponse.json(
    { preferences: getNotificationPreferences(userId) },
    { status: 200 }
  );
}

/**
 * PUT /api/preferences/notifications
 *
 * Replaces the authenticated user's notification preferences. The payload is
 * validated in full; invalid time zones or out-of-range quiet-hour times
 * return 400 with a field-level `fields` map and store nothing.
 *
 * Unknown-field policy: unknown top-level fields are stripped (not rejected)
 * so forward-compatible clients can send newer payloads without breaking.
 * The stored value is always normalized to the current schema version.
 */
export async function PUT(request: Request) {
  const userId = getRequestUserId(request);

  if (!userId) {
    return errorResponse(
      request,
      401,
      "UNAUTHENTICATED",
      "Authentication required"
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      request,
      400,
      "INVALID_JSON",
      "Invalid JSON body"
    );
  }

  const result = validateNotificationPreferences(body);
  if (!result.ok) {
    return errorResponse(
      request,
      400,
      "VALIDATION_FAILED",
      "Validation failed",
      { fields: result.fields }
    );
  }

  return NextResponse.json(
    { preferences: saveNotificationPreferences(userId, result.value) },
    { status: 200 }
  );
}
