/**
 * Tests for /api/preferences/notifications.
 *
 * Covers:
 *  - Auth boundary: 401 without a user id
 *  - Read boundary: defaults returned before anything is saved
 *  - Update boundary: valid payloads persist; invalid payloads return
 *    field-level errors and store nothing
 *  - Versioning: responses carry a schema version
 *  - Unknown-field policy: unknown fields are stripped, not persisted
 *  - Isolation: users can only read/write their own preferences
 */

import { GET, PUT } from "@/app/api/preferences/notifications/route";
import {
  defaultNotificationPreferences,
  NOTIFICATION_PREFERENCES_VERSION,
} from "@/lib/notificationPreferences";

function makeRequest(
  method: string,
  userId: string | null,
  body?: unknown
): Request {
  return new Request("http://localhost/api/preferences/notifications", {
    method,
    headers: {
      "content-type": "application/json",
      ...(userId ? { "x-user-id": userId } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function validBody() {
  return {
    channels: { push: true, email: false, inApp: true },
    timeZone: "Europe/London",
    quietHours: {
      enabled: true,
      windows: [{ start: "22:00", end: "07:00" }],
    },
  };
}

describe("GET /api/preferences/notifications", () => {
  it("returns 401 without a user id", async () => {
    const res = await GET(makeRequest("GET", null));
    expect(res.status).toBe(401);
  });

  it("returns defaults before anything is saved", async () => {
    const res = await GET(makeRequest("GET", "route-read-defaults"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.preferences).toEqual(defaultNotificationPreferences());
  });

  it("returns the saved preferences after an update", async () => {
    await PUT(makeRequest("PUT", "route-read-saved", validBody()));
    const res = await GET(makeRequest("GET", "route-read-saved"));
    const body = await res.json();
    expect(body.preferences.timeZone).toBe("Europe/London");
    expect(body.preferences.quietHours.windows).toEqual([
      { start: "22:00", end: "07:00" },
    ]);
  });

  it("includes the schema version in the response", async () => {
    const res = await GET(makeRequest("GET", "route-read-version"));
    const body = await res.json();
    expect(body.version).toBe(NOTIFICATION_PREFERENCES_VERSION);
  });

  it("does not leak another user's preferences", async () => {
    await PUT(makeRequest("PUT", "route-isolation-a", validBody()));
    const res = await GET(makeRequest("GET", "route-isolation-b"));
    const body = await res.json();
    expect(body.preferences).toEqual(defaultNotificationPreferences());
  });
});

describe("PUT /api/preferences/notifications", () => {
  it("returns 401 without a user id", async () => {
    const res = await PUT(makeRequest("PUT", null, validBody()));
    expect(res.status).toBe(401);
  });

  it("stores a valid payload and echoes it back", async () => {
    const res = await PUT(makeRequest("PUT", "route-put-valid", validBody()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.preferences).toEqual(validBody());
  });

  it("includes the schema version in the response", async () => {
    const res = await PUT(makeRequest("PUT", "route-put-version", validBody()));
    const body = await res.json();
    expect(body.version).toBe(NOTIFICATION_PREFERENCES_VERSION);
  });

  it("strips unknown fields instead of persisting them", async () => {
    const res = await PUT(
      makeRequest("PUT", "route-put-unknown", {
        ...validBody(),
        unknownField: "should be dropped",
        channels: { push: true, email: false, inApp: true, sms: true },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.preferences).toEqual(validBody());
    expect(body.preferences.unknownField).toBeUndefined();
    expect(body.preferences.channels.sms).toBeUndefined();

    const read = await GET(makeRequest("GET", "route-put-unknown"));
    const readBody = await read.json();
    expect(readBody.preferences).toEqual(validBody());
  });

  it("rejects an invalid time zone with a field-level error", async () => {
    const res = await PUT(
      makeRequest("PUT", "route-put-bad-tz", { ...validBody(), timeZone: "Mars/Olympus" })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.fields.timeZone).toBeDefined();
  });

  it("rejects out-of-range quiet-hour times with field-level errors", async () => {
    const res = await PUT(
      makeRequest("PUT", "route-put-bad-window", {
        ...validBody(),
        quietHours: { enabled: true, windows: [{ start: "25:00", end: "07:00" }] },
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.fields["quietHours.windows.0.start"]).toBeDefined();
  });

  it("rejects malformed JSON with 400", async () => {
    const request = new Request(
      "http://localhost/api/preferences/notifications",
      {
        method: "PUT",
        headers: { "x-user-id": "route-put-bad-json" },
        body: "{not json",
      }
    );
    const res = await PUT(request);
    expect(res.status).toBe(400);
  });

  it("stores nothing when validation fails", async () => {
    const res = await PUT(
      makeRequest("PUT", "route-put-no-store", { ...validBody(), timeZone: "" })
    );
    expect(res.status).toBe(400);

    const read = await GET(makeRequest("GET", "route-put-no-store"));
    const body = await read.json();
    expect(body.preferences).toEqual(defaultNotificationPreferences());
  });
});
