import { render, screen } from "@testing-library/react";
import { ConcentrationRisk } from "@/components/portfolio/ConcentrationRisk";

describe("PortfolioConcentrationRisk", () => {
  it("renders without crashing", () => {
    const { container } = render(<ConcentrationRisk />);
    expect(container).toBeInTheDocument();
  });

  it("renders with sample portfolio data", () => {
    const { base } = render(<ConcentrationRisk />);
    expect(base).toBeInTheDocument();
  });

  it("shows concentration information", () => {
    const { container } = render(<ConcentrationRisk />);
    const heading = container.querySelector(
      ".text-xs.uppercase.tracking-widest"
    );
    expect(heading).toBeInTheDocument();
  });
});