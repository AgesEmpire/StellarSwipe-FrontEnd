import { render, screen } from "@testing-library/react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

describe("Card", () => {
  // ── Card ───────────────────────────────────────────────────
  it("renders a Card container", () => {
    render(<Card data-testid="card">Card content</Card>);
    const card = screen.getByTestId("card");
    expect(card).toBeTruthy();
    expect(card.tagName).toBe("DIV");
  });

  it("renders children content", () => {
    render(<Card><p>Hello world</p></Card>);
    expect(screen.getByText("Hello world")).toBeTruthy();
  });

  it("applies default Card classes", () => {
    render(<Card data-testid="card">Test</Card>);
    const card = screen.getByTestId("card");
    expect(card.classList.contains("rounded-xl")).toBe(true);
    expect(card.classList.contains("border")).toBe(true);
    expect(card.classList.contains("shadow-sm")).toBe(true);
  });

  it("merges custom className", () => {
    render(<Card data-testid="card" className="custom-card">Test</Card>);
    const card = screen.getByTestId("card");
    expect(card.classList.contains("custom-card")).toBe(true);
  });

  it("forwards ref to the underlying div", () => {
    const ref = jest.fn();
    render(<Card ref={ref}>Ref</Card>);
    expect(ref).toHaveBeenCalled();
  });

  it("spreads additional HTML attributes", () => {
    render(<Card data-testid="card" aria-label="Test card">Accessible</Card>);
    const card = screen.getByTestId("card");
    expect(card.getAttribute("aria-label")).toBe("Test card");
  });

  // ── CardHeader ─────────────────────────────────────────────
  it("renders CardHeader", () => {
    render(
      <Card>
        <CardHeader data-testid="header">Header content</CardHeader>
      </Card>
    );
    const header = screen.getByTestId("header");
    expect(header).toBeTruthy();
    expect(header.tagName).toBe("DIV");
  });

  it("CardHeader applies default spacing classes", () => {
    render(
      <Card>
        <CardHeader data-testid="header">Header</CardHeader>
      </Card>
    );
    const header = screen.getByTestId("header");
    expect(header.classList.contains("flex")).toBe(true);
    expect(header.classList.contains("flex-col")).toBe(true);
    expect(header.classList.contains("p-5")).toBe(true);
  });

  it("CardHeader merges custom className", () => {
    render(
      <Card>
        <CardHeader data-testid="header" className="custom-header">Header</CardHeader>
      </Card>
    );
    const header = screen.getByTestId("header");
    expect(header.classList.contains("custom-header")).toBe(true);
  });

  it("CardHeader forwards ref", () => {
    const ref = jest.fn();
    render(
      <Card>
        <CardHeader ref={ref}>Ref header</CardHeader>
      </Card>
    );
    expect(ref).toHaveBeenCalled();
  });

  // ── CardContent ────────────────────────────────────────────
  it("renders CardContent", () => {
    render(
      <Card>
        <CardContent data-testid="content">Body content</CardContent>
      </Card>
    );
    const content = screen.getByTestId("content");
    expect(content).toBeTruthy();
    expect(content.tagName).toBe("DIV");
  });

  it("CardContent applies default padding classes", () => {
    render(
      <Card>
        <CardContent data-testid="content">Content</CardContent>
      </Card>
    );
    const content = screen.getByTestId("content");
    expect(content.classList.contains("px-5")).toBe(true);
    expect(content.classList.contains("pb-5")).toBe(true);
  });

  it("CardContent merges custom className", () => {
    render(
      <Card>
        <CardContent data-testid="content" className="custom-content">Content</CardContent>
      </Card>
    );
    const content = screen.getByTestId("content");
    expect(content.classList.contains("custom-content")).toBe(true);
  });

  it("CardContent forwards ref", () => {
    const ref = jest.fn();
    render(
      <Card>
        <CardContent ref={ref}>Ref content</CardContent>
      </Card>
    );
    expect(ref).toHaveBeenCalled();
  });

  // ── Composition ────────────────────────────────────────────
  it("renders full Card composition (Card + CardHeader + CardContent)", () => {
    render(
      <Card data-testid="card">
        <CardHeader data-testid="header">Title</CardHeader>
        <CardContent data-testid="content">Body text</CardContent>
      </Card>
    );
    expect(screen.getByTestId("card")).toBeTruthy();
    expect(screen.getByTestId("header")).toBeTruthy();
    expect(screen.getByTestId("content")).toBeTruthy();
    expect(screen.getByText("Title")).toBeTruthy();
    expect(screen.getByText("Body text")).toBeTruthy();
  });
});
