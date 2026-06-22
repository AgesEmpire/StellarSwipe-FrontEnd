import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CopyButton } from "@/components/ui/copy-button";

// Mock the useClipboard hook
jest.mock("@/hooks/useClipboard");

import { useClipboard } from "@/hooks/useClipboard";

const mockUseClipboard = useClipboard as jest.MockedFunction<typeof useClipboard>;

describe("CopyButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseClipboard.mockReturnValue({
      copied: false,
      copy: jest.fn(),
    });
  });

  // ── Rendering ──────────────────────────────────────────────
  it("renders with default label", () => {
    render(<CopyButton value="test-value" />);
    expect(screen.getByText("Copy")).toBeTruthy();
  });

  it("renders with custom label", () => {
    render(<CopyButton value="test-value" label="Copy Address" />);
    expect(screen.getByText("Copy Address")).toBeTruthy();
  });

  it("renders copy icon when not copied", () => {
    mockUseClipboard.mockReturnValue({
      copied: false,
      copy: jest.fn(),
    });
    render(<CopyButton value="test-value" />);
    const btn = screen.getByRole("button");
    // Copy icon should be present (lucide Copy icon renders as svg)
    expect(btn.querySelector("svg")).toBeTruthy();
  });

  // ── Copied state ───────────────────────────────────────────
  it("shows 'Copied!' text when copied", () => {
    mockUseClipboard.mockReturnValue({
      copied: true,
      copy: jest.fn(),
    });
    render(<CopyButton value="test-value" />);
    expect(screen.getByText("Copied!")).toBeTruthy();
  });

  it("shows check icon when copied", () => {
    mockUseClipboard.mockReturnValue({
      copied: true,
      copy: jest.fn(),
    });
    render(<CopyButton value="test-value" />);
    const btn = screen.getByRole("button");
    expect(btn.querySelector("svg")).toBeTruthy();
  });

  // ── Click behavior ─────────────────────────────────────────
  it("calls copy with the value prop when clicked", async () => {
    const mockCopy = jest.fn();
    mockUseClipboard.mockReturnValue({
      copied: false,
      copy: mockCopy,
    });
    render(<CopyButton value="my-secret-value" />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockCopy).toHaveBeenCalledWith("my-secret-value");
  });

  it("calls copy with different values", () => {
    const mockCopy = jest.fn();
    mockUseClipboard.mockReturnValue({
      copied: false,
      copy: mockCopy,
    });
    render(<CopyButton value="0x1234abcd" />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockCopy).toHaveBeenCalledWith("0x1234abcd");
  });

  // ── Accessibility ──────────────────────────────────────────
  it("has correct aria-label before copying", () => {
    render(<CopyButton value="test" label="Copy TX Hash" />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toBe("Copy TX Hash");
  });

  it("has correct aria-label after copying", () => {
    mockUseClipboard.mockReturnValue({
      copied: true,
      copy: jest.fn(),
    });
    render(<CopyButton value="test" label="Copy TX Hash" />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toBe("Copied!");
  });

  it("has title attribute matching label", () => {
    render(<CopyButton value="test" label="Copy Address" />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("title")).toBe("Copy Address");
  });

  it("has title attribute 'Copied!' when copied", () => {
    mockUseClipboard.mockReturnValue({
      copied: true,
      copy: jest.fn(),
    });
    render(<CopyButton value="test" />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("title")).toBe("Copied!");
  });

  it("is a button element", () => {
    render(<CopyButton value="test" />);
    expect(screen.getByRole("button").tagName).toBe("BUTTON");
  });

  it("has type='button'", () => {
    render(<CopyButton value="test" />);
    expect(screen.getByRole("button").getAttribute("type")).toBe("button");
  });

  // ── Custom className ───────────────────────────────────────
  it("merges custom className", () => {
    render(<CopyButton value="test" className="custom-copy" />);
    const btn = screen.getByRole("button");
    expect(btn.classList.contains("custom-copy")).toBe(true);
  });

  // ── Disabled state ─────────────────────────────────────────
  it("can be disabled", () => {
    render(<CopyButton value="test" disabled />);
    const btn = screen.getByRole("button");
    expect(btn.hasAttribute("disabled")).toBe(true);
  });

  it("does not call copy when disabled", () => {
    const mockCopy = jest.fn();
    mockUseClipboard.mockReturnValue({
      copied: false,
      copy: mockCopy,
    });
    render(<CopyButton value="test" disabled />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockCopy).not.toHaveBeenCalled();
  });

  // ── Ref forwarding ─────────────────────────────────────────
  it("forwards ref to the underlying button element", () => {
    const ref = jest.fn();
    render(<CopyButton value="test" ref={ref} />);
    expect(ref).toHaveBeenCalled();
  });

  // ── resetDelay prop ────────────────────────────────────────
  it("passes resetDelay to useClipboard hook", () => {
    render(<CopyButton value="test" resetDelay={5000} />);
    expect(mockUseClipboard).toHaveBeenCalledWith({ resetDelay: 5000 });
  });

  it("uses default resetDelay of 2000", () => {
    render(<CopyButton value="test" />);
    expect(mockUseClipboard).toHaveBeenCalledWith({ resetDelay: 2000 });
  });
});
