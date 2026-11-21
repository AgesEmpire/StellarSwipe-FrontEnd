import { classifyChartSeries, chartFallbackCopy } from "@/lib/chartState";

describe("classifyChartSeries", () => {
  it("reports empty for null, undefined and empty arrays", () => {
    expect(classifyChartSeries(null).state).toBe("empty");
    expect(classifyChartSeries(undefined).state).toBe("empty");
    expect(classifyChartSeries([]).state).toBe("empty");
  });

  it("reports insufficient below minPoints (default 2)", () => {
    const r = classifyChartSeries([5]);
    expect(r.state).toBe("insufficient");
    expect(r.usablePoints).toBe(1);
  });

  it("reports ready at or above minPoints", () => {
    expect(classifyChartSeries([1, 2]).state).toBe("ready");
    expect(classifyChartSeries([1, 2, 3], { minPoints: 3 }).state).toBe("ready");
  });

  it("honors a custom minPoints threshold", () => {
    expect(classifyChartSeries([1], { minPoints: 3 }).state).toBe("insufficient");
    expect(classifyChartSeries([1, 2], { minPoints: 3 }).state).toBe("insufficient");
    expect(classifyChartSeries([1, 2, 3], { minPoints: 3 }).state).toBe("ready");
  });

  it("drops non-finite and non-numeric values and flags them", () => {
    const r = classifyChartSeries([1, NaN, Infinity, "x" as unknown as number, 2]);
    expect(r.usablePoints).toBe(2);
    expect(r.hadUnsupportedValues).toBe(true);
  });

  it("reports empty when every value is unsupported", () => {
    const r = classifyChartSeries([NaN, Infinity, "nope" as unknown as number]);
    expect(r.state).toBe("empty");
    expect(r.usablePoints).toBe(0);
    expect(r.hadUnsupportedValues).toBe(true);
  });
});

describe("chartFallbackCopy", () => {
  it("empty state explains no data and the next step", () => {
    const c = chartFallbackCopy("empty");
    expect(c.title).toBe("No chart data yet");
    expect(c.message).toContain("doesn't have any price data");
    expect(c.actionHint).toContain("trading activity");
    expect(c.inlineLabel).toBe("No chart data yet");
  });

  it("insufficient state explains limited history", () => {
    const c = chartFallbackCopy("insufficient");
    expect(c.title).toBe("Not enough history yet");
    expect(c.message).toContain("little price history");
    expect(c.actionHint).toContain("history");
    expect(c.inlineLabel).toBe("Not enough history yet");
  });

  it("personalizes the message with the asset name", () => {
    const c = chartFallbackCopy("empty", { assetName: "XLM/USDC" });
    expect(c.message).toContain("XLM/USDC");
  });

  it("falls back to a generic subject without a usable asset name", () => {
    const blank = chartFallbackCopy("empty", { assetName: "   " });
    expect(blank.message).toContain("This asset");
    const none = chartFallbackCopy("insufficient");
    expect(none.message).toContain("This asset");
  });
});
