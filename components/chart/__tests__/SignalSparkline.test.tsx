/**
 * @jest-environment jsdom
 */
/**
 * Render tests for components/chart/SignalSparkline.tsx (issue #408)
 *
 * Verifies that the SignalCard sparkline region conditionally renders the mini
 * chart vs. a static placeholder based on the Data Saver setting, and that
 * toggling the setting restores the chart immediately (no reload).
 */
import { render, screen } from "@testing-library/react";
import { SignalSparkline } from "@/components/chart/SignalSparkline";
import { useDataSaverStore } from "@/store/useDataSaverStore";
import { useChartStyleStore } from "@/store/useChartStyleStore";

beforeEach(() => {
  useDataSaverStore.getState().setDataSaverEnabled(false);
  useChartStyleStore.getState().setChartStyle("line");
});

describe("SignalSparkline – Data Saver conditional rendering", () => {
  it("renders the mini chart and chart-style toggle when Data Saver is OFF", () => {
    useDataSaverStore.getState().setDataSaverEnabled(false);
    render(<SignalSparkline data={[1, 2, 3, 4]} />);

    // No placeholder; the chart-style toggle only renders alongside a real chart.
    expect(screen.queryByTestId("data-saver-chart-placeholder")).toBeNull();
    expect(
      screen.getByRole("button", { name: /switch to candlestick chart/i })
    ).toBeTruthy();
  });

  it("renders a static placeholder and no chart when Data Saver is ON", () => {
    useDataSaverStore.getState().setDataSaverEnabled(true);
    render(<SignalSparkline data={[1, 2, 3, 4]} />);

    expect(screen.getByTestId("data-saver-chart-placeholder")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /switch to candlestick chart/i })
    ).toBeNull();
  });

  it("re-renders the chart when Data Saver is disabled again (immediate, no reload)", () => {
    useDataSaverStore.getState().setDataSaverEnabled(true);
    const { rerender } = render(<SignalSparkline data={[1, 2, 3, 4]} />);
    expect(screen.getByTestId("data-saver-chart-placeholder")).toBeTruthy();

    useDataSaverStore.getState().setDataSaverEnabled(false);
    rerender(<SignalSparkline data={[1, 2, 3, 4]} />);

    expect(screen.queryByTestId("data-saver-chart-placeholder")).toBeNull();
    expect(
      screen.getByRole("button", { name: /switch to candlestick chart/i })
    ).toBeTruthy();
  });
});
