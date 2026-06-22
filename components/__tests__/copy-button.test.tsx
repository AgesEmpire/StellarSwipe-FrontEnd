import * as React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CopyButton } from "@/components/ui/copy-button";

// Mock the useClipboard hook
jest.mock("@/hooks/useClipboard", () => ({
  useClipboard: jest.fn(),
}));

import { useClipboard } from "@/hooks/useClipboard";
const mockUseClipboard = useClipboard as jest.MockedFunction<typeof useClipboard>;

describe("CopyButton", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUseClipboard.mockReturnValue({
      copied: false,
      copy: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders with default label", () => {
    render(<CopyButton value="test-value" />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toBe("Copy");
    expect(btn.getAttribute("title")).toBe("Copy");
  });

  it("renders with custom label", () => {
    render(<CopyButton value="test-value" label="Copy Address" />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toBe("Copy Address");
  });

  it("shows copied state", () => {
    mockUseClipboard.mockReturnValue({
      copied: true,
      copy: jest.fn(),
    });
    render(<CopyButton value="test-value" />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toBe("Copied!");
    expect(btn.getAttribute("title")).toBe("Copied!");
  });

  it("calls copy with value on click", () => {
    const mockCopy = jest.fn();
    mockUseClipboard.mockReturnValue({
      copied: false,
      copy: mockCopy,
    });
    render(<CopyButton value="my-text" />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockCopy).toHaveBeenCalledWith("my-text");
  });

  it("passes resetDelay to useClipboard", () => {
    render(<CopyButton value="test" resetDelay={5000} />);
    expect(mockUseClipboard).toHaveBeenCalledWith({ resetDelay: 5000 });
  });

  it("uses default resetDelay of 2000", () => {
    render(<CopyButton value="test" />);
    expect(mockUseClipboard).toHaveBeenCalledWith({ resetDelay: 2000 });
  });

  it("forwards ref correctly", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<CopyButton value="test" ref={ref} />);
    expect(ref.current).toBeTruthy();
    expect(ref.current?.tagName).toBe("BUTTON");
  });

  it("merges custom className", () => {
    render(<CopyButton value="test" className="custom-copy" />);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("custom-copy");
  });

  it("spreads additional button props", () => {
    render(<CopyButton value="test" data-testid="copy-btn" disabled />);
    const btn = screen.getByTestId("copy-btn");
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("renders as a button element", () => {
    render(<CopyButton value="test" />);
    const btn = screen.getByRole("button");
    expect(btn.tagName).toBe("BUTTON");
    expect(btn.getAttribute("type")).toBe("button");
  });
});
