/**
 * @jest-environment jsdom
 *
 * Fake-timer tests for useQRPairing: code generation/display, TTL-driven
 * expiry, API-error handling, and the success/paired transition.
 *
 * Issue #242 follow-up — the hook previously shipped with no test coverage
 * for its countdown, polling, and status-transition logic.
 */

import { renderHook, act } from "@testing-library/react";
import { useQRPairing } from "@/hooks/useQRPairing";
import { useWalletStore } from "@/store/useWalletStore";

const QR_TTL_MS = 120_000;
const POLL_MS = 2_000;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function pendingResponse(): Response {
  return new Response(null, { status: 404 });
}

/** Advance fake timers and flush pending promise reactions from the poll. */
async function advance(ms: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

describe("useQRPairing", () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    jest.useFakeTimers();
    useWalletStore.setState({
      wallets: [],
      activePublicKey: null,
      publicKey: null,
      isConnected: false,
      network: "TESTNET",
    });
    fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(pendingResponse());
  });

  afterEach(() => {
    jest.useRealTimers();
    fetchSpy.mockRestore();
  });

  it("generates and displays a pairing code when a session starts", () => {
    const { result } = renderHook(() => useQRPairing());

    act(() => {
      result.current.startSession();
    });

    expect(result.current.status).toBe("pending");
    expect(result.current.sessionId).toBeTruthy();
    expect(result.current.uri).toBe(
      `stellarswipe://pair?s=${result.current.sessionId}&o=${encodeURIComponent(
        window.location.origin
      )}`
    );
    expect(result.current.secondsLeft).toBe(QR_TTL_MS / 1000);
    expect(result.current.errorMessage).toBeNull();
  });

  it("expires the code once the TTL elapses and stops polling", async () => {
    const { result } = renderHook(() => useQRPairing());

    act(() => {
      result.current.startSession();
    });

    // Just before expiry: still pending.
    await advance(QR_TTL_MS - 1_000);
    expect(result.current.status).toBe("pending");

    await advance(1_000);
    expect(result.current.status).toBe("expired");
    expect(result.current.errorMessage).toMatch(/expired/i);
    expect(result.current.secondsLeft).toBe(0);

    const callsAtExpiry = fetchSpy.mock.calls.length;
    await advance(POLL_MS * 3);
    expect(fetchSpy.mock.calls.length).toBe(callsAtExpiry); // polling has stopped
  });

  it("regenerating after expiry returns to pending with a fresh code and full TTL", async () => {
    const { result } = renderHook(() => useQRPairing());

    act(() => {
      result.current.startSession();
    });
    const firstSessionId = result.current.sessionId;

    await advance(QR_TTL_MS);
    expect(result.current.status).toBe("expired");

    act(() => {
      result.current.regenerate();
    });

    expect(result.current.status).toBe("pending");
    expect(result.current.secondsLeft).toBe(QR_TTL_MS / 1000);
    expect(result.current.sessionId).not.toBe(firstSessionId);
    expect(result.current.errorMessage).toBeNull();
  });

  it("surfaces a distinct error state when the pairing API errors, with a retry path", async () => {
    const { result } = renderHook(() => useQRPairing());

    act(() => {
      result.current.startSession();
    });

    fetchSpy.mockResolvedValue(new Response(null, { status: 500 }));

    await advance(POLL_MS);

    expect(result.current.status).toBe("error");
    expect(result.current.errorMessage).toMatch(/error occurred/i);
    expect(result.current.status).not.toBe("expired");
    expect(result.current.status).not.toBe("rejected");

    // Retry: regenerate() (the "New code" action) takes it back to pending.
    fetchSpy.mockResolvedValue(pendingResponse());
    act(() => {
      result.current.regenerate();
    });

    expect(result.current.status).toBe("pending");
    expect(result.current.errorMessage).toBeNull();
  });

  it("surfaces a rejected state distinct from a generic error", async () => {
    const { result } = renderHook(() => useQRPairing());

    act(() => {
      result.current.startSession();
    });

    fetchSpy.mockResolvedValue(jsonResponse({ status: "rejected" }));
    await advance(POLL_MS);

    expect(result.current.status).toBe("rejected");
    expect(result.current.errorMessage).toMatch(/rejected/i);
  });

  it("transitions to the paired/connected state on a successful pairing event", async () => {
    const { result } = renderHook(() => useQRPairing());

    act(() => {
      result.current.startSession();
    });

    const publicKey = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRS";
    fetchSpy.mockResolvedValue(
      jsonResponse({ status: "paired", publicKey })
    );

    const dispatchSpy = jest.spyOn(window, "dispatchEvent");

    await advance(POLL_MS);

    expect(result.current.status).toBe("paired");
    expect(result.current.publicKey).toBe(publicKey);
    expect(useWalletStore.getState().publicKey).toBe(publicKey);
    expect(useWalletStore.getState().isConnected).toBe(true);
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "wallet-connected" })
    );

    // Polling/countdown stop once paired.
    const callsAtPaired = fetchSpy.mock.calls.length;
    await advance(POLL_MS * 3);
    expect(fetchSpy.mock.calls.length).toBe(callsAtPaired);

    dispatchSpy.mockRestore();
  });

  it("cancel resets the session to idle and stops timers", async () => {
    const { result } = renderHook(() => useQRPairing());

    act(() => {
      result.current.startSession();
    });
    await advance(POLL_MS);

    act(() => {
      result.current.cancel();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.uri).toBeNull();
    expect(result.current.sessionId).toBeNull();

    const callsAtCancel = fetchSpy.mock.calls.length;
    await advance(QR_TTL_MS);
    expect(fetchSpy.mock.calls.length).toBe(callsAtCancel);
    expect(result.current.status).toBe("idle");
  });
});
