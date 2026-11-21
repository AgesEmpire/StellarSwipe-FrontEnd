import { journalEntrySchema, type JournalEntry } from "@/lib/journalSchema";
import { improveJournalMessages } from "@/lib/journalValidation";

type V = Partial<JournalEntry>;

/** Fills the required enum fields the form always provides, then overrides. */
function full(values: V): V {
  return {
    date: "2026-01-01",
    assetPair: "XLM/USDC",
    type: "MANUAL",
    amount: "1",
    price: "2",
    token: "XLM",
    status: "SUCCEEDED",
    outcome: "PENDING",
    ...values,
  };
}

/** Replicates exactly how JournalEntryForm parses before submit. */
function issuesFor(values: V) {
  const result = journalEntrySchema.safeParse({ ...values, fee: values.fee || "0" });
  return result.success ? [] : result.error.issues;
}

describe("improveJournalMessages", () => {
  it("returns an empty map when there are no issues", () => {
    const values = full({});
    const out = improveJournalMessages(issuesFor(values), values);
    expect(Object.keys(out).length).toBe(0);
  });

  it("marks empty numeric fields as required", () => {
    const values = full({ amount: "" });
    expect(improveJournalMessages(issuesFor(values), values).amount).toBe(
      "Amount is required"
    );
  });

  it("flags non-numeric amounts with a number hint", () => {
    const values = full({ amount: "abc" });
    expect(improveJournalMessages(issuesFor(values), values).amount).toBe(
      "Amount must be a number (e.g. 12.5)"
    );
  });

  it("flags zero or negative amounts as greater than 0", () => {
    expect(
      improveJournalMessages(issuesFor(full({ amount: "0" })), full({ amount: "0" })).amount
    ).toBe("Amount must be greater than 0");
    expect(
      improveJournalMessages(issuesFor(full({ amount: "-3" })), full({ amount: "-3" }))
        .amount
    ).toBe("Amount must be greater than 0");
  });

  it("accepts a positive amount with no message", () => {
    const values = full({ amount: "5" });
    expect(improveJournalMessages(issuesFor(values), values).amount).toBeUndefined();
  });

  it("handles fee specifically: non-negative, no message at 0", () => {
    expect(
      improveJournalMessages(issuesFor(full({ fee: "-1" })), full({ fee: "-1" })).fee
    ).toBe("Fee cannot be negative");
    expect(
      improveJournalMessages(issuesFor(full({ fee: "0" })), full({ fee: "0" })).fee
    ).toBeUndefined();
  });

  it("keeps the example guidance on required asset pair / token", () => {
    expect(
      improveJournalMessages(issuesFor(full({ assetPair: "" })), full({ assetPair: "" }))
        .assetPair
    ).toMatch(/required/i);
    expect(
      improveJournalMessages(issuesFor(full({ token: "" })), full({ token: "" })).token
    ).toMatch(/required/i);
  });

  it("reports multiple fields at once with specific messages", () => {
    const values = full({ assetPair: "", amount: "abc", price: "-1" });
    const out = improveJournalMessages(issuesFor(values), values);
    expect(Object.keys(out).length).toBe(3);
    expect(out).toHaveProperty("amount");
    expect(out).toHaveProperty("assetPair");
    expect(out).toHaveProperty("price");
    expect(out.amount).toBe("Amount must be a number (e.g. 12.5)");
    expect(out.price).toBe("Price must be greater than 0");
  });
});
