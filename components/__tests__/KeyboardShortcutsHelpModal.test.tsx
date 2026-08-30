/** @jest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/react";
import { KeyboardShortcutsHelpModal } from "@/components/KeyboardShortcutsHelpModal";

describe("KeyboardShortcutsHelpModal", () => {
  it("renders the keyboard shortcuts list with all sections", () => {
    render(<KeyboardShortcutsHelpModal open={true} onClose={jest.fn()} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Keyboard shortcuts")).toBeInTheDocument();

    // Section headers
    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
    expect(screen.getByText("Modals & Overlays")).toBeInTheDocument();

    // Key shortcuts that should be present
    expect(screen.getByText("Escape")).toBeInTheDocument();
    expect(screen.getByText("Close any open modal or overlay")).toBeInTheDocument();
    expect(screen.getByText("Go to Signals feed")).toBeInTheDocument();
    expect(screen.getByText("Open command palette")).toBeInTheDocument();
  });

  it("closes when Escape is pressed inside the dialog", () => {
    const onClose = jest.fn();
    render(<KeyboardShortcutsHelpModal open={true} onClose={onClose} />);

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when the backdrop is clicked", () => {
    const onClose = jest.fn();
    render(<KeyboardShortcutsHelpModal open={true} onClose={onClose} />);

    fireEvent.click(screen.getByTestId("keyboard-shortcuts-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not render when closed", () => {
    render(<KeyboardShortcutsHelpModal open={false} onClose={jest.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
