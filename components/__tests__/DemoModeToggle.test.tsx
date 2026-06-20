import { render, screen, fireEvent } from "@testing-library/react";
import { DemoModeToggle } from "@/components/DemoModeToggle";
import { useDemoModeStore } from "@/store/useDemoModeStore";

jest.mock("@/store/useDemoModeStore");

const mockUseDemoModeStore = useDemoModeStore as jest.MockedFunction<typeof useDemoModeStore>;

describe("DemoModeToggle", () => {
  it("renders toggle button in off state", () => {
    mockUseDemoModeStore.mockReturnValue({
      isDemoMode: false,
      isHydrated: true,
      toggleDemoMode: jest.fn(),
      setDemoMode: jest.fn(),
      setHydrated: jest.fn(),
    });

    render(<DemoModeToggle />);
    expect(screen.getByText("Demo Mode")).toBeTruthy();
    expect(screen.queryByText("ON")).toBeNull();
  });

  it("renders toggle button in on state", () => {
    mockUseDemoModeStore.mockReturnValue({
      isDemoMode: true,
      isHydrated: true,
      toggleDemoMode: jest.fn(),
      setDemoMode: jest.fn(),
      setHydrated: jest.fn(),
    });

    render(<DemoModeToggle />);
    expect(screen.getByText("Demo Mode")).toBeTruthy();
    expect(screen.getByText("ON")).toBeTruthy();
  });

  it("calls toggle on click", () => {
    const mockToggle = jest.fn();
    mockUseDemoModeStore.mockReturnValue({
      isDemoMode: false,
      isHydrated: true,
      toggleDemoMode: mockToggle,
      setDemoMode: jest.fn(),
      setHydrated: jest.fn(),
    });

    render(<DemoModeToggle />);
    fireEvent.click(screen.getByRole("button", { name: /enter demo mode/i }));
    expect(mockToggle).toHaveBeenCalled();
  });

  it("disables the toggle until the persisted value is hydrated", () => {
    const mockToggle = jest.fn();
    mockUseDemoModeStore.mockReturnValue({
      isDemoMode: true,
      isHydrated: false,
      toggleDemoMode: mockToggle,
      setDemoMode: jest.fn(),
      setHydrated: jest.fn(),
    });

    render(<DemoModeToggle />);

    const button = screen.getByRole("button", { name: /loading demo mode/i });
    expect(button).toHaveProperty("disabled", true);
    expect(screen.queryByText("ON")).toBeNull();

    fireEvent.click(button);
    expect(mockToggle).not.toHaveBeenCalled();
  });
});
