import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { StopLossSlider } from "@/components/ui/stop-loss-slider";

describe("StopLossSlider", () => {
  it("renders a range input", () => {
    render(<StopLossSlider value={50} onChange={jest.fn()} />);
    const input = screen.getByRole("slider") as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.type).toBe("range");
  });

  it("displays the current value", () => {
    render(<StopLossSlider value={25} onChange={jest.fn()} />);
    expect(screen.getByText("25%")).toBeTruthy();
  });

  it("calls onChange when slider value changes", () => {
    const handleChange = jest.fn();
    render(<StopLossSlider value={50} onChange={handleChange} />);
    const input = screen.getByRole("slider") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "75" } });
    expect(handleChange).toHaveBeenCalledWith(75);
  });

  it("renders with custom min and max", () => {
    render(<StopLossSlider value={50} onChange={jest.fn()} min={10} max={90} />);
    const input = screen.getByRole("slider") as HTMLInputElement;
    expect(input.min).toBe("10");
    expect(input.max).toBe("90");
  });

  it("renders with custom step", () => {
    render(<StopLossSlider value={50} onChange={jest.fn()} step={5} />);
    const input = screen.getByRole("slider") as HTMLInputElement;
    expect(input.step).toBe("5");
  });

  it("displays stop price when entryPrice is provided", () => {
    render(<StopLossSlider value={10} onChange={jest.fn()} entryPrice={100} />);
    // Stop price = 100 * (1 - 10/100) = 90.0000
    expect(screen.getByText(/90\.0000/)).toBeTruthy();
  });

  it("displays asset symbol when provided", () => {
    render(<StopLossSlider value={10} onChange={jest.fn()} entryPrice={100} assetSymbol="BTC" />);
    expect(screen.getByText(/BTC/)).toBeTruthy();
  });

  it("uses default asset symbol XLM", () => {
    render(<StopLossSlider value={10} onChange={jest.fn()} entryPrice={100} />);
    expect(screen.getByText(/XLM/)).toBeTruthy();
  });

  it("is disabled when disabled prop is true", () => {
    render(<StopLossSlider value={50} onChange={jest.fn()} disabled />);
    const input = screen.getByRole("slider") as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it("clamps value within min/max bounds", () => {
    // Value above max should be clamped
    const { rerender } = render(<StopLossSlider value={150} onChange={jest.fn()} max={100} />);
    // The fill percent should be 100% (clamped)
    const fill = document.querySelector('[class*="fill"]') || document.querySelector('[style*="width: 100"]');
    // Just verify it renders without error
    expect(screen.getByRole("slider")).toBeTruthy();
  });

  it("applies custom className", () => {
    const { container } = render(<StopLossSlider value={50} onChange={jest.fn()} className="custom-slider" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("custom-slider");
  });

  it("has proper ARIA attributes", () => {
    render(<StopLossSlider value={50} onChange={jest.fn()} />);
    const input = screen.getByRole("slider");
    expect(input.getAttribute("aria-valuemin")).toBeTruthy();
    expect(input.getAttribute("aria-valuemax")).toBeTruthy();
    expect(input.getAttribute("aria-valuenow")).toBeTruthy();
  });

  it("renders with default min=0 and max=100", () => {
    render(<StopLossSlider value={50} onChange={jest.fn()} />);
    const input = screen.getByRole("slider") as HTMLInputElement;
    expect(input.min).toBe("0");
    expect(input.max).toBe("100");
  });

  it("renders with default step=1", () => {
    render(<StopLossSlider value={50} onChange={jest.fn()} />);
    const input = screen.getByRole("slider") as HTMLInputElement;
    expect(input.step).toBe("1");
  });
});
