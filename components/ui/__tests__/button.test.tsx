import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  // ── Rendering ──────────────────────────────────────────────
  it("renders a button with default variant and size", () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole("button", { name: /click me/i });
    expect(btn).toBeTruthy();
    expect(btn.tagName).toBe("BUTTON");
  });

  it("renders children text", () => {
    render(<Button>Submit</Button>);
    expect(screen.getByText("Submit")).toBeTruthy();
  });

  // ── Variants ───────────────────────────────────────────────
  const variants = ["default", "destructive", "outline", "secondary", "ghost", "link"] as const;
  variants.forEach((variant) => {
    it(`renders ${variant} variant`, () => {
      render(<Button variant={variant}>Variant</Button>);
      const btn = screen.getByRole("button", { name: /variant/i });
      expect(btn).toBeTruthy();
    });
  });

  // ── Sizes ──────────────────────────────────────────────────
  const sizes = ["default", "sm", "lg", "icon"] as const;
  sizes.forEach((size) => {
    it(`renders ${size} size`, () => {
      render(<Button size={size}>Size</Button>);
      const btn = screen.getByRole("button", { name: /size/i });
      expect(btn).toBeTruthy();
    });
  });

  // ── Events ─────────────────────────────────────────────────
  it("calls onClick handler when clicked", () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole("button", { name: /click/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when disabled", () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick} disabled>Click</Button>);
    fireEvent.click(screen.getByRole("button", { name: /click/i }));
    expect(handleClick).not.toHaveBeenCalled();
  });

  // ── asChild ────────────────────────────────────────────────
  it("renders as child component when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    const link = screen.getByRole("link", { name: /link button/i });
    expect(link).toBeTruthy();
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/test");
  });

  // ── Accessibility ──────────────────────────────────────────
  it("is focusable via keyboard", () => {
    render(<Button>Focus</Button>);
    const btn = screen.getByRole("button", { name: /focus/i });
    btn.focus();
    expect(btn).toBe(document.activeElement);
  });

  it("has disabled attribute when disabled", () => {
    render(<Button disabled>Disabled</Button>);
    const btn = screen.getByRole("button", { name: /disabled/i });
    expect(btn.hasAttribute("disabled")).toBe(true);
  });

  // ── Custom className ───────────────────────────────────────
  it("merges custom className with default styles", () => {
    render(<Button className="custom-class">Custom</Button>);
    const btn = screen.getByRole("button", { name: /custom/i });
    expect(btn.classList.contains("custom-class")).toBe(true);
  });

  // ── Ref forwarding ─────────────────────────────────────────
  it("forwards ref to the underlying button element", () => {
    const ref = jest.fn();
    render(<Button ref={ref}>Ref</Button>);
    expect(ref).toHaveBeenCalled();
  });

  // ── Type attribute ─────────────────────────────────────────
  it("does not set type attribute by default (browser default is submit)", () => {
    render(<Button>Type</Button>);
    const btn = screen.getByRole("button", { name: /type/i });
    // When type is not explicitly set, getAttribute returns null
    // The browser default is "submit" but the attribute isn't in the DOM
    expect(btn.getAttribute("type")).toBeNull();
  });

  it("accepts type submit", () => {
    render(<Button type="submit">Submit</Button>);
    const btn = screen.getByRole("button", { name: /submit/i });
    expect(btn.getAttribute("type")).toBe("submit");
  });
});
