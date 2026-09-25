/**
 * @jest-environment jsdom
 *
 * Tests for QRPairingPanel's status-driven UI: the expiry countdown display,
 * the "expired"/"error" states with their retry action, and the
 * success/connected transition (Issue #242 follow-up).
 *
 * The underlying useQRPairing hook is mocked so each status can be asserted
 * in isolation; the hook's own timer/polling behavior is covered separately
 * in hooks/__tests__/useQRPairing.test.ts.
 */

import { render, screen, fireEvent, act } from "@testing-library/react";
import { QRPairingPanel } from "@/components/QRPairingPanel";
import { useQRPairing } from "@/hooks/useQRPairing";
import type { QRPairingStatus } from "@/hooks/useQRPairing";

jest.mock("@sentry/nextjs", () => ({
  captureException: jest.fn(),
}));

jest.mock("@/lib/qrcode", () => ({
  renderQRCode: jest.fn(),
}));

jest.mock("@/hooks/useQRPairing", () => ({
  useQRPairing: jest.fn(),
}));

const mockedUseQRPairing = useQRPairing as jest.Mock;

const TTL_MS = 120_000;

function mockHookState(overrides: {
  status: QRPairingStatus;
  secondsLeft?: number;
  errorMessage?: string | null;
  uri?: string | null;
}) {
  const startSession = jest.fn();
  const regenerate = jest.fn();
  const cancel = jest.fn();

  mockedUseQRPairing.mockReturnValue({
    status: overrides.status,
    uri: overrides.uri ?? "stellarswipe://pair?s=abc123&o=https%3A%2F%2Fapp",
    sessionId: "abc123",
    secondsLeft: overrides.secondsLeft ?? TTL_MS / 1000,
    ttlMs: TTL_MS,
    publicKey: overrides.status === "paired" ? "GPUBLICKEY" : null,
    errorMessage: overrides.errorMessage ?? null,
    startSession,
    regenerate,
    cancel,
  });

  return { startSession, regenerate, cancel };
}

describe("QRPairingPanel", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("displays the generated pairing code with the expiry countdown while pending", () => {
    mockHookState({ status: "pending", secondsLeft: 90 });

    render(<QRPairingPanel onSuccess={jest.fn()} onCancel={jest.fn()} />);

    expect(
      screen.getByRole("img", { name: /wallet pairing qr code/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Waiting for scan…")).toBeInTheDocument();
    expect(screen.getByText("1:30")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /generate a new pairing code/i })
    ).not.toBeInTheDocument();
  });

  it("shows the expired state with a retry action once the code expires", () => {
    const { regenerate } = mockHookState({
      status: "expired",
      secondsLeft: 0,
      errorMessage: "Pairing code expired. Generate a new one.",
    });

    render(<QRPairingPanel onSuccess={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.getByText("Code expired")).toBeInTheDocument();
    expect(
      screen.getByText("Pairing code expired. Generate a new one.")
    ).toBeInTheDocument();

    const retryButton = screen.getByRole("button", {
      name: /generate a new pairing code/i,
    });
    fireEvent.click(retryButton);
    expect(regenerate).toHaveBeenCalledTimes(1);
  });

  it("shows a distinct failed-pairing error state with a retry action", () => {
    const { regenerate } = mockHookState({
      status: "error",
      errorMessage: "An error occurred during pairing. Please try again.",
    });

    render(<QRPairingPanel onSuccess={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.getByText("Pairing error")).toBeInTheDocument();
    expect(
      screen.getByText("An error occurred during pairing. Please try again.")
    ).toBeInTheDocument();

    const retryButton = screen.getByRole("button", {
      name: /generate a new pairing code/i,
    });
    fireEvent.click(retryButton);
    expect(regenerate).toHaveBeenCalledTimes(1);
  });

  it("distinguishes a rejected pairing from a generic error", () => {
    mockHookState({
      status: "rejected",
      errorMessage: "Pairing was rejected by the mobile wallet.",
    });

    render(<QRPairingPanel onSuccess={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.getByText("Pairing rejected")).toBeInTheDocument();
    expect(screen.queryByText("Pairing error")).not.toBeInTheDocument();
  });

  it("transitions to the success/connected UI and calls onSuccess after the paired delay", () => {
    jest.useFakeTimers();
    mockHookState({ status: "paired" });
    const onSuccess = jest.fn();

    render(<QRPairingPanel onSuccess={onSuccess} onCancel={jest.fn()} />);

    expect(screen.getByText("Successfully paired")).toBeInTheDocument();
    expect(screen.getByText("Wallet paired!")).toBeInTheDocument();
    // Cancel action is hidden once paired.
    expect(
      screen.queryByRole("button", { name: "Cancel" })
    ).not.toBeInTheDocument();

    expect(onSuccess).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(1200);
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it("calls cancel and onCancel when the user cancels an in-progress pairing", () => {
    const { cancel } = mockHookState({ status: "pending" });
    const onCancel = jest.fn();

    render(<QRPairingPanel onSuccess={jest.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
