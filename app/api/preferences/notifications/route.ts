import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/providerFollows";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  validateNotificationPreferences,
} from "@/lib/notificationPreferences";

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
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
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
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const result = validateNotificationPreferences(body);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Validation failed", fields: result.fields },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { preferences: saveNotificationPreferences(userId, result.value) },
    { status: 200 }
  );
}
