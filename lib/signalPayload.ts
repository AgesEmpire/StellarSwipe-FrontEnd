/**
 * Signal payload validation and normalization.
 *
 * Provider signals must pass this validation before they are published to the
 * feed. Any payload with missing, out-of-range, or incorrectly-typed fields is
 * rejected with a structured error — no partial record is ever created.
 *
 * Fields
 * ──────
 *  asset      – non-empty trading pair string, e.g. "XLM/USDC"
 *  direction  – "BUY" | "SELL" (NEUTRAL is not a publishable signal)
 *  entry      – positive finite number (entry price)
 *  risk       – number in (0, 100] representing the risk percentage
 *  expiry     – ISO 8601 timestamp that must be in the future
 */

import { z } from "zod";

// ── Raw DTO schema (what providers POST) ────────────────────────────────────

export const PublishSignalSchema = z.object({
  asset: z
    .string({ required_error: "asset is required" })
    .trim()
    .min(1, "asset must not be empty"),

  direction: z.enum(["BUY", "SELL"], {
    required_error: "direction is required",
    message: 'direction must be "BUY" or "SELL"',
  }),

  entry: z
    .number({ required_error: "entry is required", invalid_type_error: "entry must be a number" })
    .positive("entry must be a positive number")
    .finite("entry must be a finite number"),

  risk: z
    .number({ required_error: "risk is required", invalid_type_error: "risk must be a number" })
    .gt(0, "risk must be greater than 0")
    .lte(100, "risk must be at most 100"),

  expiry: z
    .string({ required_error: "expiry is required" })
    .datetime({ message: "expiry must be a valid ISO 8601 datetime string" })
    .refine(
      (val) => new Date(val).getTime() > Date.now(),
      "expiry must be a future timestamp"
    ),
});

export type PublishSignalDto = z.input<typeof PublishSignalSchema>;

// ── Normalized signal (what the system stores / publishes) ───────────────────

export interface NormalizedSignal {
  asset: string;
  direction: "BUY" | "SELL";
  entry: number;
  risk: number;
  expiry: string; // ISO 8601
}

/**
 * Validates and normalizes a raw provider payload.
 *
 * @returns `{ success: true, data: NormalizedSignal }` on valid input.
 * @returns `{ success: false, errors: string[] }` on invalid input — no
 *          partial record is created.
 */
export function validateSignalPayload(
  raw: unknown
):
  | { success: true; data: NormalizedSignal }
  | { success: false; errors: string[] } {
  const result = PublishSignalSchema.safeParse(raw);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => {
      // Zod v4 does not include the field name in the message itself.
      // Prefix the path so callers get actionable error strings.
      const path = issue.path.length > 0 ? (issue.path as string[]).join(".") : null;
      return path ? `${path}: ${issue.message}` : issue.message;
    });
    return { success: false, errors };
  }

  const { asset, direction, entry, risk, expiry } = result.data;

  return {
    success: true,
    data: {
      asset: asset.trim().toUpperCase(),
      direction,
      entry,
      risk,
      expiry,
    },
  };
}
