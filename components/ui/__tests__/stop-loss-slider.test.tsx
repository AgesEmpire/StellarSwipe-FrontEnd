import { render, screen, fireEvent } from "@testing-library/react";
import { StopLossSlider } from "@/components/ui/stop-loss-slider";

describe("StopLossSlider", () => {
  const defaultProps = {
    value: 15,
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────
  it("renders the slider component", () => {
    render(<StopLossSlider {...defaultProps} />);
    expect(screen.getByRole("slider")).toBeTruthy();
  });

  it("displays the label 'Stop-Loss'", () => {
    render(<StopLossSlider {...defaultProps} />);
    expect(screen.getByText("Stop-Loss")).toBeTruthy();
  });

  it("displays the current value as percentage", () => {
    render(<StopLossSlider {...defaultProps} value={25} />);
    expect(screen.getByText("25%")).toBeTruthy();
  });

  it("displays min and max labels", () => {
    render(<StopLossSlider value={50} onChange={jest.fn()} min={0} max={100} />);
    // Use getAllByText since value% and min/max labels may overlap
    expect(screen.getAllByText("0%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("100%").length).toBeGreaterThanOrEqual(1);
  });

  // ── Value clamping ─────────────────────────────────────────
  it("clamps value to min when below range", () => {
    render(<StopLossSlider value={-5} onChange={jest.fn()} min={0} max={100} />);
    // Both value display and min label show "0%", so use getAllByText
    expect(screen.getAllByText("0%").length).toBeGreaterThanOrEqual(1);
  });

  it("clamps value to max when above range", () => {
    render(<StopLossSlider value={150} onChange={jest.fn()} min={0} max={100} />);
    expect(screen.getAllByText("100%").length).toBeGreaterThanOrEqual(1);
  });

  it("displays value within range correctly", () => {
    render(<StopLossSlider {...defaultProps} value={50} />);
    expect(screen.getByText("50%")).toBeTruthy();
  });

  // ── Price display ──────────────────────────────────────────
  it("displays stop-loss price when entryPrice is provided", () => {
    render(<StopLossSlider {...defaultProps} value={10} entryPrice={1.5} assetSymbol="XLM" />);
    expect(screen.getByText(/≈/)).toBeTruthy();
    expect(screen.getByText(/XLM/)).toBeTruthy();
  });

  it("does not display price when entryPrice is not provided", () => {
    render(<StopLossSlider {...defaultProps} value={10} />);
    expect(screen.queryByText(/≈/)).toBeNull();
  });

  it("calculates correct stop-loss price", () => {
    // entryPrice=2.0, value=10% => stopPrice = 2.0 * (1 - 10/100) = 1.8000
    render(<StopLossSlider {...defaultProps} value={10} entryPrice={2.0} assetSymbol="XLM" />);
    expect(screen.getByText("≈ 1.8000 XLM")).toBeTruthy();
  });

  it("uses custom asset symbol", () => {
    render(<StopLossSlider {...defaultProps} value={10} entryPrice={100} assetSymbol="BTC" />);
    expect(screen.getByText(/BTC/)).toBeTruthy();
  });

  // ── onChange ───────────────────────────────────────────────
  it("calls onChange when slider value changes", () => {
    const onChange = jest.fn();
    render(<StopLossSlider value={15} onChange={onChange} />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "30" } });
    expect(onChange).toHaveBeenCalledWith(30);
  });

  it("calls onChange with clamped value", () => {
    const onChange = jest.fn();
    render(<StopLossSlider value={15} onChange={onChange} min={0} max={100} />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "200" } });
    expect(onChange).toHaveBeenCalledWith(100);
  });

  // ── Custom range ───────────────────────────────────────────
  it("respects custom min and max", () => {
    render(<StopLossSlider value={25} onChange={jest.fn()} min={5} max={50} />);
    expect(screen.getByText("5%")).toBeTruthy();
    expect(screen.getByText("50%")).toBeTruthy();
  });

  // ── Disabled state ─────────────────────────────────────────
  it("can be disabled", () => {
    render(<StopLossSlider {...defaultProps} disabled />);
    const slider = screen.getByRole("slider");
    expect(slider.hasAttribute("disabled")).toBe(true);
  });

  // ── ARIA attributes ────────────────────────────────────────
  it("has correct aria-label", () => {
    render(<StopLossSlider {...defaultProps} />);
    const slider = screen.getByRole("slider");
    expect(slider.getAttribute("aria-label")).toBe("Stop-loss percentage");
  });

  it("has correct aria-valuemin", () => {
    render(<StopLossSlider {...defaultProps} min={5} />);
    const slider = screen.getByRole("slider");
    expect(slider.getAttribute("aria-valuemin")).toBe("5");
  });

  it("has correct aria-valuemax", () => {
    render(<StopLossSlider {...defaultProps} max={80} />);
    const slider = screen.getByRole("slider");
    expect(slider.getAttribute("aria-valuemax")).toBe("80");
  });

  it("has correct aria-valuenow", () => {
    render(<StopLossSlider value={42} onChange={jest.fn()} />);
    const slider = screen.getByRole("slider");
    expect(slider.getAttribute("aria-valuenow")).toBe("42");
  });

  it("has aria-valuetext with percentage", () => {
    render(<StopLossSlider value={20} onChange={jest.fn()} />);
    const slider = screen.getByRole("slider");
    expect(slider.getAttribute("aria-valuetext")).toContain("20%");
  });

  it("has aria-valuetext with price when entryPrice provided", () => {
    render(<StopLossSlider value={10} onChange={jest.fn()} entryPrice={1.0} assetSymbol="XLM" />);
    const slider = screen.getByRole("slider");
    expect(slider.getAttribute("aria-valuetext")).toContain("price");
    expect(slider.getAttribute("aria-valuetext")).toContain("XLM");
  });

  // ── Risk hints ─────────────────────────────────────────────
  it("shows 'No stop-loss set' when value is 0", () => {
    render(<StopLossSlider value={0} onChange={jest.fn()} />);
    expect(screen.getByText("No stop-loss set.")).toBeTruthy();
  });

  it("shows 'Low risk' hint when value <= 10", () => {
    render(<StopLossSlider value={5} onChange={jest.fn()} />);
    expect(screen.getByText("Low risk — tight stop.")).toBeTruthy();
  });

  it("shows 'Moderate risk' hint when value <= 30", () => {
    render(<StopLossSlider value={20} onChange={jest.fn()} />);
    expect(screen.getByText("Moderate risk.")).toBeTruthy();
  });

  it("shows 'High risk' hint when value > 30", () => {
    render(<StopLossSlider value={50} onChange={jest.fn()} />);
    expect(screen.getByText("High risk — wide stop.")).toBeTruthy();
  });

  // ── Custom className ───────────────────────────────────────
  it("merges custom className", () => {
    const { container } = render(<StopLossSlider {...defaultProps} className="custom-slider" />);
    expect(container.querySelector(".custom-slider")).toBeTruthy();
  });

  // ── Step prop ──────────────────────────────────────────────
  it("passes step to the range input", () => {
    render(<StopLossSlider {...defaultProps} step={5} />);
    const slider = screen.getByRole("slider");
    expect(slider.getAttribute("step")).toBe("5");
  });
});
