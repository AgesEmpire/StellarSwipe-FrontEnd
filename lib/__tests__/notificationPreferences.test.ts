/**
 * Tests for lib/notificationPreferences.ts
 *
 * Covers:
 *  - Happy path: valid payload with channels, time zone and overnight windows
 *  - Field-level failures: invalid timezones, malformed times, out-of-range
 *    window counts, non-boolean channels
 *  - Boundaries: window count limits, 00:00 / 23:59 endpoints, start == end
 *  - Store: defaults on first read, persistence, per-user isolation
 */

import {
  MAX_QUIET_HOURS_WINDOWS,
  defaultNotificationPreferences,
  getNotificationPreferences,
  saveNotificationPreferences,
  validateNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notificationPreferences";

/** A fully valid payload that field-specific tests can spread over. */
function validPreferences() {
  return {
    channels: { push: true, email: false, inApp: true },
    timeZone: "Europe/London",
    quietHours: {
      enabled: true,
      windows: [{ start: "22:00", end: "07:00" }],
    },
  };
}

function expectOk(raw: unknown): NotificationPreferences {
  const result = validateNotificationPreferences(raw);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("unreachable");
  return result.value;
}

function expectFields(raw: unknown): Record<string, string> {
  const result = validateNotificationPreferences(raw);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  return result.fields;
}

describe("validateNotificationPreferences", () => {
  it("accepts a fully valid payload, including an overnight window", () => {
    const value = expectOk(validPreferences());
    expect(value.timeZone).toBe("Europe/London");
    expect(value.quietHours.windows).toEqual([{ start: "22:00", end: "07:00" }]);
  });

  it("accepts a same-day window (start < end)", () => {
    const raw = {
      ...validPreferences(),
      quietHours: { enabled: true, windows: [{ start: "09:00", end: "17:00" }] },
    };
    const value = expectOk(raw);
    expect(value.quietHours.windows[0]).toEqual({ start: "09:00", end: "17:00" });
  });

  it("rejects an invalid IANA time zone with a timeZone field error", () => {
    const fields = expectFields({ ...validPreferences(), timeZone: "Mars/Olympus" });
    expect(fields.timeZone).toBeDefined();
  });

  it("rejects a missing or empty time zone", () => {
    expect(expectFields({ ...validPreferences(), timeZone: "" }).timeZone).toBeDefined();
    expect(expectFields({ ...validPreferences(), timeZone: undefined }).timeZone).toBeDefined();
  });

  it("defaults absent channels but rejects non-boolean channel values", () => {
    const { channels, ...rest } = validPreferences();
    void channels;
    const value = expectOk(rest);
    expect(value.channels).toEqual(defaultNotificationPreferences().channels);

    const fields = expectFields({
      ...validPreferences(),
      channels: { push: "yes" },
    });
    expect(fields["channels.push"]).toBeDefined();
  });

  it("rejects out-of-range times with per-field errors", () => {
    for (const bad of ["24:00", "12:60", "9:00", "07:0", "", 7]) {
      const fields = expectFields({
        ...validPreferences(),
        quietHours: { enabled: true, windows: [{ start: bad, end: "07:00" }] },
      });
      expect(fields["quietHours.windows.0.start"]).toBeDefined();
    }
  });

  it("rejects a window whose start equals its end", () => {
    const fields = expectFields({
      ...validPreferences(),
      quietHours: { enabled: true, windows: [{ start: "07:00", end: "07:00" }] },
    });
    expect(fields["quietHours.windows.0.end"]).toBeDefined();
  });

  it("enforces the window-count boundaries", () => {
    const window = { start: "22:00", end: "07:00" };

    expect(
      expectFields({
        ...validPreferences(),
        quietHours: { enabled: true, windows: [] },
      })["quietHours.windows"]
    ).toBeDefined();

    const maxWindows = Array.from({ length: MAX_QUIET_HOURS_WINDOWS }, (_, i) => ({
      start: `${String(i).padStart(2, "0")}:00`,
      end: `${String(i).padStart(2, "0")}:30`,
    }));
    const value = expectOk({
      ...validPreferences(),
      quietHours: { enabled: true, windows: maxWindows },
    });
    expect(value.quietHours.windows).toHaveLength(MAX_QUIET_HOURS_WINDOWS);

    expect(
      expectFields({
        ...validPreferences(),
        quietHours: { enabled: true, windows: [...maxWindows, window] },
      })["quietHours.windows"]
    ).toBeDefined();
  });

  it("rejects a non-object body", () => {
    for (const bad of [null, "text", 42, ["push"]]) {
      expect(expectFields(bad).body).toBeDefined();
    }
  });

  it("accepts the boundary times 00:00 and 23:59", () => {
    const value = expectOk({
      ...validPreferences(),
      quietHours: { enabled: true, windows: [{ start: "00:00", end: "23:59" }] },
    });
    expect(value.quietHours.windows[0]).toEqual({ start: "00:00", end: "23:59" });
  });
});

describe("notification preferences store", () => {
  it("returns defaults for a user with no saved preferences", () => {
    expect(getNotificationPreferences("user-never-saved")).toEqual(
      defaultNotificationPreferences()
    );
  });

  it("persists saved preferences across reads", () => {
    const saved = saveNotificationPreferences("user-persist", {
      ...validPreferences(),
      timeZone: "Asia/Kolkata",
    });
    expect(saved.timeZone).toBe("Asia/Kolkata");
    expect(getNotificationPreferences("user-persist").timeZone).toBe("Asia/Kolkata");
  });

  it("isolates preferences per user", () => {
    saveNotificationPreferences("user-a", {
      ...validPreferences(),
      channels: { push: true, email: true, inApp: false },
    });
    saveNotificationPreferences("user-b", {
      ...validPreferences(),
      channels: { push: false, email: false, inApp: true },
    });

    expect(getNotificationPreferences("user-a").channels.email).toBe(true);
    expect(getNotificationPreferences("user-b").channels.email).toBe(false);
    expect(getNotificationPreferences("user-c").channels).toEqual(
      defaultNotificationPreferences().channels
    );
  });

  it("does not alias the caller's arrays or objects", () => {
    const preferences: NotificationPreferences = {
      ...validPreferences(),
      quietHours: { enabled: true, windows: [{ start: "21:00", end: "23:00" }] },
    };
    const saved = saveNotificationPreferences("user-copy", preferences);

    preferences.quietHours.windows[0].start = "00:00";
    preferences.channels.push = false;

    expect(getNotificationPreferences("user-copy").quietHours.windows[0].start).toBe("21:00");
    expect(getNotificationPreferences("user-copy").channels.push).toBe(true);
  });
});
