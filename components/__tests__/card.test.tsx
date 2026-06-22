import * as React from "react";
import { render, screen } from "@testing-library/react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

describe("Card", () => {
  it("renders a card container", () => {
    render(<Card>Card content</Card>);
    const card = screen.getByText("Card content");
    expect(card.tagName).toBe("DIV");
    expect(card.className).toContain("rounded-xl");
    expect(card.className).toContain("border");
    expect(card.className).toContain("bg-card");
  });

  it("merges custom className", () => {
    render(<Card className="custom-card">Content</Card>);
    const card = screen.getByText("Content");
    expect(card.className).toContain("custom-card");
    expect(card.className).toContain("rounded-xl");
  });

  it("forwards ref correctly", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Card ref={ref}>Ref Card</Card>);
    expect(ref.current).toBeTruthy();
    expect(ref.current?.tagName).toBe("DIV");
  });

  it("has correct display name", () => {
    expect(Card.displayName).toBe("Card");
  });

  it("spreads additional HTML attributes", () => {
    render(<Card data-testid="my-card" role="region">Attr Card</Card>);
    const card = screen.getByTestId("my-card");
    expect(card.getAttribute("role")).toBe("region");
  });
});

describe("CardHeader", () => {
  it("renders card header", () => {
    render(<CardHeader>Header content</CardHeader>);
    const header = screen.getByText("Header content");
    expect(header.tagName).toBe("DIV");
    expect(header.className).toContain("flex");
    expect(header.className).toContain("flex-col");
  });

  it("merges custom className", () => {
    render(<CardHeader className="custom-header">Header</CardHeader>);
    const header = screen.getByText("Header");
    expect(header.className).toContain("custom-header");
  });

  it("forwards ref correctly", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<CardHeader ref={ref}>Ref Header</CardHeader>);
    expect(ref.current).toBeTruthy();
  });

  it("has correct display name", () => {
    expect(CardHeader.displayName).toBe("CardHeader");
  });
});

describe("CardContent", () => {
  it("renders card content", () => {
    render(<CardContent>Body content</CardContent>);
    const content = screen.getByText("Body content");
    expect(content.tagName).toBe("DIV");
    expect(content.className).toContain("px-5");
    expect(content.className).toContain("pb-5");
  });

  it("merges custom className", () => {
    render(<CardContent className="custom-content">Content</CardContent>);
    const content = screen.getByText("Content");
    expect(content.className).toContain("custom-content");
  });

  it("forwards ref correctly", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<CardContent ref={ref}>Ref Content</CardContent>);
    expect(ref.current).toBeTruthy();
  });

  it("has correct display name", () => {
    expect(CardContent.displayName).toBe("CardContent");
  });
});

describe("Card composition", () => {
  it("renders full card composition", () => {
    render(
      <Card>
        <CardHeader>Title</CardHeader>
        <CardContent>Body</CardContent>
      </Card>
    );
    expect(screen.getByText("Title")).toBeTruthy();
    expect(screen.getByText("Body")).toBeTruthy();
  });
});
