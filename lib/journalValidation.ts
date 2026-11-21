import type { ZodIssue } from "zod";
import type { JournalEntry } from "./journalSchema";

/**
 * Maps a Zod issue path's first segment to a human-friendly field label.
 */
const FIELD_LABELS: Record<string, string> = {
  date: "Date",
  assetPair: "Asset pair",
  amount: "Amount",
  price: "Price",
  fee: "Fee",
  token: "Token symbol",
};

/**
 * Fields that expect a numeric value. For these we distinguish between
 * "not a number at all" and "a number but out of the allowed range" so the
 * message the user sees tells them exactly what to fix.
 */
const NUMERIC_FIELDS = new Set(["amount", "price", "fee"]);

/**
 * Turns Zod's generic `refine` message into a specific, actionable one based on
 * the raw value the user typed. Pure function — no React, fully unit-testable.
 *
 * @param issues  the issues produced by `journalEntrySchema.safeParse`
 * @param values  the raw form values the schema was run against
 * @returns       a field-name → message map suitable for inline errors
 */
export function improveJournalMessages(
  issues: ZodIssue[],
  values: Partial<JournalEntry>
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "");
    if (!field) continue;
    const raw = String(values[field as keyof JournalEntry] ?? "");
    errors[field] = improveMessage(field, raw, issue.message);
  }
  return errors;
}

function improveMessage(field: string, raw: string, fallback: string): string {
  if (NUMERIC_FIELDS.has(field)) {
    if (raw.trim() === "") return `${label(field)} is required`;
    if (isNaN(Number(raw))) return `${label(field)} must be a number (e.g. 12.5)`;
    if (field === "fee") {
      if (Number(raw) < 0) return `${label(field)} cannot be negative`;
      return fallback;
    }
    if (Number(raw) <= 0) return `${label(field)} must be greater than 0`;
    return fallback;
  }
  if (field === "date" && raw.trim() === "") return `${label(field)} is required`;
  return fallback;
}

function label(field: string): string {
  return FIELD_LABELS[field] ?? field;
}
