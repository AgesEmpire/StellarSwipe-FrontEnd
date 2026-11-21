/**
 * Notification preferences (server-side model).
 *
 * Stores per-user notification settings backing
 * `GET/PUT /api/preferences/notifications`:
 *
 *  - channel enablement (push / email / inApp)
 *  - the user's IANA time zone, used to interpret quiet-hour windows
 *  - quiet-hour schedules: daily windows (local time) during which
 *    non-critical notifications are deferred. Windows may cross midnight
 *    (e.g. 22:00 → 07:00), so overnight schedules are representable.
 *
 * Validation is field-level: invalid time zones and out-of-range times come
 * back as a per-field message map so the settings UI can highlight exactly
 * the offending input.
 */

import { isValidTimeZone } from "@/lib/quietHours";

// ── Types ───────────────────────────────────────────────────────────────────

export const NOTIFICATION_CHANNELS = ["push", "email", "inApp"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
export type ChannelPreferences = Record<NotificationChannel, boolean>;

/** 24-hour "HH:MM". `end <= start` marks an overnight (cross-midnight) window. */
export interface QuietHoursWindow {
  start: string;
  end: string;
}

export interface QuietHoursPreferences {
  enabled: boolean;
  windows: QuietHoursWindow[];
}

export interface NotificationPreferences {
  channels: ChannelPreferences;
  /** IANA time zone, e.g. "Europe/London". */
  timeZone: string;
  quietHours: QuietHoursPreferences;
}

/** Field-level errors keyed by input path, e.g. `timeZone`, `quietHours.windows.0.start`. */
export type FieldErrors = Record<string, string>;

export type ValidationResult =
  | { ok: true; value: NotificationPreferences }
  | { ok: false; fields: FieldErrors };

// ── Boundaries ──────────────────────────────────────────────────────────────

/** At most this many quiet-hour windows per schedule. */
export const MAX_QUIET_HOURS_WINDOWS = 3;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// ── Defaults ────────────────────────────────────────────────────────────────

export function defaultNotificationPreferences(): NotificationPreferences {
  return {
    channels: { push: true, email: false, inApp: true },
    timeZone: "UTC",
    quietHours: {
      enabled: false,
      // A single overnight window, matching the client-side defaults in
      // lib/quietHours.ts (22:00 → 07:00).
      windows: [{ start: "22:00", end: "07:00" }],
    },
  };
}

// ── Validation ──────────────────────────────────────────────────────────────

function validateWindow(
  raw: unknown,
  index: number,
  fields: FieldErrors
): QuietHoursWindow | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    fields[`quietHours.windows.${index}`] = "Each window must be an object with start and end times.";
    return null;
  }

  const { start, end } = raw as Record<string, unknown>;
  let valid = true;

  for (const [key, value] of [
    ["start", start],
    ["end", end],
  ] as const) {
    if (typeof value !== "string" || !TIME_PATTERN.test(value)) {
      fields[`quietHours.windows.${index}.${key}`] =
        "Must be a 24-hour time in the form HH:MM (00:00–23:59).";
      valid = false;
    }
  }

  if (!valid) return null;

  const normalized = { start: start as string, end: end as string };
  if (normalized.start === normalized.end) {
    fields[`quietHours.windows.${index}.end`] =
      "Window end must differ from window start.";
    return null;
  }
  // A start greater than the end is a valid overnight window (crosses
  // midnight), so no further range check applies here.
  return normalized;
}

function validateChannels(
  raw: unknown,
  fields: FieldErrors
): ChannelPreferences | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    fields.channels = "channels must be an object with boolean values.";
    return null;
  }

  const record = raw as Record<string, unknown>;
  const result = { ...defaultNotificationPreferences().channels };
  let valid = true;

  for (const channel of NOTIFICATION_CHANNELS) {
    const value = record[channel];
    if (value === undefined) continue; // absent channels keep their default
    if (typeof value !== "boolean") {
      fields[`channels.${channel}`] = "Must be true or false.";
      valid = false;
      continue;
    }
    result[channel] = value;
  }
  // Unknown channel keys are ignored so newer clients stay forward-compatible.

  return valid ? result : null;
}

function validateQuietHours(
  raw: unknown,
  fields: FieldErrors
): QuietHoursPreferences | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    fields.quietHours = "quietHours must be an object with enabled and windows.";
    return null;
  }

  const { enabled, windows } = raw as Record<string, unknown>;
  let valid = true;

  if (typeof enabled !== "boolean") {
    fields["quietHours.enabled"] = "Must be true or false.";
    valid = false;
  }

  if (!Array.isArray(windows)) {
    fields["quietHours.windows"] = "windows must be an array of { start, end } times.";
    return null;
  }
  if (windows.length < 1 || windows.length > MAX_QUIET_HOURS_WINDOWS) {
    fields["quietHours.windows"] =
      `Provide between 1 and ${MAX_QUIET_HOURS_WINDOWS} windows.`;
    return null;
  }

  const validatedWindows: QuietHoursWindow[] = [];
  windows.forEach((window, index) => {
    const result = validateWindow(window, index, fields);
    if (result) validatedWindows.push(result);
  });

  if (Object.keys(fields).some((key) => key.startsWith("quietHours.windows"))) {
    valid = false;
  }
  if (!valid) return null;

  return { enabled: enabled as boolean, windows: validatedWindows };
}

/**
 * Validates and normalizes a raw notification-preferences payload.
 *
 * Returns `{ ok: true, value }` with defaults filled for absent channels, or
 * `{ ok: false, fields }` with a per-field message for every invalid input.
 */
export function validateNotificationPreferences(
  raw: unknown
): ValidationResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, fields: { body: "Body must be a JSON object." } };
  }

  const { channels, timeZone, quietHours } = raw as Record<string, unknown>;
  const fields: FieldErrors = {};

  const validChannels = validateChannels(channels ?? {}, fields);

  let validTimeZone: string | null = null;
  if (typeof timeZone !== "string" || timeZone.trim() === "") {
    fields.timeZone = "A time zone is required (e.g. \"Europe/London\").";
  } else if (!isValidTimeZone(timeZone)) {
    fields.timeZone = "Must be a valid IANA time zone, e.g. \"Europe/London\".";
  } else {
    validTimeZone = timeZone;
  }

  const validQuietHours = validateQuietHours(
    quietHours ?? {},
    fields
  );

  if (Object.keys(fields).length > 0) {
    return { ok: false, fields };
  }

  return {
    ok: true,
    value: {
      channels: validChannels as ChannelPreferences,
      timeZone: validTimeZone as string,
      quietHours: validQuietHours as QuietHoursPreferences,
    },
  };
}

// ── Per-user store (in-memory, matching lib/providerFollows.ts) ─────────────

const preferencesByUser = new Map<string, NotificationPreferences>();

/** Returns the user's saved preferences, or the defaults when none exist. */
export function getNotificationPreferences(
  userId: string
): NotificationPreferences {
  return preferencesByUser.get(userId) ?? defaultNotificationPreferences();
}

/** Replaces the user's preferences and returns the stored copy. */
export function saveNotificationPreferences(
  userId: string,
  preferences: NotificationPreferences
): NotificationPreferences {
  const stored: NotificationPreferences = {
    channels: { ...preferences.channels },
    timeZone: preferences.timeZone,
    quietHours: {
      enabled: preferences.quietHours.enabled,
      windows: preferences.quietHours.windows.map((w) => ({ ...w })),
    },
  };
  preferencesByUser.set(userId, stored);
  return stored;
}
