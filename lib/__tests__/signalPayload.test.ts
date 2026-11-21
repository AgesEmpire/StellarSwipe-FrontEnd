/**
 * Tests for lib/signalPayload.ts
 *
 * Covers:
 *  - Happy-path: valid payload is accepted and normalized
 *  - Individual field failures (asset, direction, entry, risk, expiry)
 *  - Edge cases: boundary values, non-object input, extra fields ignored
 */

import { validateSignalPayload } from "@/lib/signalPayload";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Returns a future ISO timestamp offset by `msFromNow` milliseconds. */
function futureISO(msFromNow = 60_000): string {
  return new Date(Date.now() + msFromNow).toISOString();
}

/** A valid base payload that every field-specific test can spread over. */
function validPayload() {
  return {
    asset: "XLM/USDC",
    direction: "BUY" as const,
    entry: 0.4821,
    risk: 2.5,
    expiry: futureISO(),
  };
}

// ── Valid payloads ───────────────────────────────────────────────────────────

describe("validateSignalPayload – valid inputs", () => {
  it("accepts a well-formed BUY signal and returns success", () => {
    const result = validateSignalPayload(validPayload());
    expect(result.success).toBe(true);
    if (!result.success) return; // type narrowing
    expect(result.data.asset).toBe("XLM/USDC");
    expect(result.data.direction).toBe("BUY");
    expect(result.data.entry).toBe(0.4821);
    expect(result.data.risk).toBe(2.5);
  });

  it("accepts a well-formed SELL signal", () => {
    const result = validateSignalPayload({ ...validPayload(), direction: "SELL" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.direction).toBe("SELL");
  });

  it("normalizes asset to uppercase", () => {
    const result = validateSignalPayload({ ...validPayload(), asset: "xlm/usdc" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.asset).toBe("XLM/USDC");
  });

  it("normalizes asset by trimming surrounding whitespace", () => {
    const result = validateSignalPayload({ ...validPayload(), asset: "  BTC/USDC  " });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.asset).toBe("BTC/USDC");
  });

  it("accepts risk = 100 (boundary maximum)", () => {
    const result = validateSignalPayload({ ...validPayload(), risk: 100 });
    expect(result.success).toBe(true);
  });

  it("accepts risk just above 0 (boundary minimum)", () => {
    const result = validateSignalPayload({ ...validPayload(), risk: 0.01 });
    expect(result.success).toBe(true);
  });

  it("ignores extra unknown fields and still returns a clean normalized signal", () => {
    const result = validateSignalPayload({
      ...validPayload(),
      unknownField: "should be stripped",
      anotherField: 999,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).not.toHaveProperty("unknownField");
  });
});

// ── Asset field failures ─────────────────────────────────────────────────────

describe("validateSignalPayload – asset field", () => {
  it("rejects a missing asset", () => {
    const { asset: _removed, ...payload } = validPayload();
    const result = validateSignalPayload(payload);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.some((e) => /asset/i.test(e))).toBe(true);
  });

  it("rejects an empty asset string", () => {
    const result = validateSignalPayload({ ...validPayload(), asset: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.some((e) => /asset/i.test(e))).toBe(true);
  });

  it("rejects an asset that is whitespace only", () => {
    const result = validateSignalPayload({ ...validPayload(), asset: "   " });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.some((e) => /asset/i.test(e))).toBe(true);
  });

  it("rejects a non-string asset", () => {
    const result = validateSignalPayload({ ...validPayload(), asset: 123 });
    expect(result.success).toBe(false);
  });
});

// ── Direction field failures ─────────────────────────────────────────────────

describe("validateSignalPayload – direction field", () => {
  it("rejects a missing direction", () => {
    const { direction: _removed, ...payload } = validPayload();
    const result = validateSignalPayload(payload);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.some((e) => /direction/i.test(e))).toBe(true);
  });

  it("rejects direction = 'NEUTRAL'", () => {
    const result = validateSignalPayload({ ...validPayload(), direction: "NEUTRAL" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.some((e) => /direction/i.test(e))).toBe(true);
  });

  it("rejects direction = 'buy' (lowercase)", () => {
    const result = validateSignalPayload({ ...validPayload(), direction: "buy" });
    expect(result.success).toBe(false);
  });

  it("rejects direction = 'HOLD'", () => {
    const result = validateSignalPayload({ ...validPayload(), direction: "HOLD" });
    expect(result.success).toBe(false);
  });
});

// ── Entry field failures ─────────────────────────────────────────────────────

describe("validateSignalPayload – entry field", () => {
  it("rejects a missing entry", () => {
    const { entry: _removed, ...payload } = validPayload();
    const result = validateSignalPayload(payload);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.some((e) => /entry/i.test(e))).toBe(true);
  });

  it("rejects entry = 0", () => {
    const result = validateSignalPayload({ ...validPayload(), entry: 0 });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.some((e) => /entry/i.test(e))).toBe(true);
  });

  it("rejects a negative entry", () => {
    const result = validateSignalPayload({ ...validPayload(), entry: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects Infinity as entry", () => {
    const result = validateSignalPayload({ ...validPayload(), entry: Infinity });
    expect(result.success).toBe(false);
  });

  it("rejects NaN as entry", () => {
    const result = validateSignalPayload({ ...validPayload(), entry: NaN });
    expect(result.success).toBe(false);
  });

  it("rejects a string entry value", () => {
    const result = validateSignalPayload({ ...validPayload(), entry: "0.48" });
    expect(result.success).toBe(false);
  });
});

// ── Risk field failures ──────────────────────────────────────────────────────

describe("validateSignalPayload – risk field", () => {
  it("rejects a missing risk", () => {
    const { risk: _removed, ...payload } = validPayload();
    const result = validateSignalPayload(payload);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.some((e) => /risk/i.test(e))).toBe(true);
  });

  it("rejects risk = 0 (exclusive lower bound)", () => {
    const result = validateSignalPayload({ ...validPayload(), risk: 0 });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.some((e) => /risk/i.test(e))).toBe(true);
  });

  it("rejects risk > 100", () => {
    const result = validateSignalPayload({ ...validPayload(), risk: 100.01 });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.some((e) => /risk/i.test(e))).toBe(true);
  });

  it("rejects a negative risk", () => {
    const result = validateSignalPayload({ ...validPayload(), risk: -5 });
    expect(result.success).toBe(false);
  });
});

// ── Expiry field failures ────────────────────────────────────────────────────

describe("validateSignalPayload – expiry field", () => {
  it("rejects a missing expiry", () => {
    const { expiry: _removed, ...payload } = validPayload();
    const result = validateSignalPayload(payload);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.some((e) => /expiry/i.test(e))).toBe(true);
  });

  it("rejects an expiry in the past", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    const result = validateSignalPayload({ ...validPayload(), expiry: past });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.some((e) => /expiry/i.test(e))).toBe(true);
  });

  it("rejects a non-ISO date string", () => {
    const result = validateSignalPayload({ ...validPayload(), expiry: "31-12-2099" });
    expect(result.success).toBe(false);
  });

  it("rejects a plain date without time component (not ISO 8601)", () => {
    const result = validateSignalPayload({ ...validPayload(), expiry: "2099-12-31" });
    expect(result.success).toBe(false);
  });

  it("rejects a numeric timestamp as expiry", () => {
    const result = validateSignalPayload({
      ...validPayload(),
      expiry: Date.now() + 60_000,
    });
    expect(result.success).toBe(false);
  });
});

// ── Non-object / null input ──────────────────────────────────────────────────

describe("validateSignalPayload – malformed top-level input", () => {
  it("rejects null", () => {
    expect(validateSignalPayload(null).success).toBe(false);
  });

  it("rejects a plain string", () => {
    expect(validateSignalPayload("XLM BUY").success).toBe(false);
  });

  it("rejects an array", () => {
    expect(validateSignalPayload([]).success).toBe(false);
  });

  it("rejects undefined", () => {
    expect(validateSignalPayload(undefined).success).toBe(false);
  });

  it("rejects an empty object", () => {
    const result = validateSignalPayload({});
    expect(result.success).toBe(false);
    if (result.success) return;
    // Should report errors for all required fields
    expect(result.errors.length).toBeGreaterThanOrEqual(5);
  });

  it("returns errors array (not throws) on invalid input", () => {
    expect(() => validateSignalPayload(null)).not.toThrow();
    const result = validateSignalPayload(null);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(Array.isArray(result.errors)).toBe(true);
  });
});
