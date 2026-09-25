"use client";

/**
 * useQRPairing
 *
 * Manages a QR-code based wallet pairing session:
 *  - Generates a unique pairing token (UUID + origin) encoded as a deep-link URI
 *  - Tracks expiry with a countdown
 *  - Polls for pairing completion (mobile wallet signals back via the /api/qr-pair endpoint)
 *  - Exposes helpers to regenerate the code and cancel the session
 *
 * The pairing URI is intentionally kept minimal so it encodes into a short
 * QR code (version 3-5). Real WalletConnect sessions would use a relay server;
 * here we simulate the handshake so the full UX flow is in place.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useWalletStore } from "@/store/useWalletStore";
import { walletToast } from "@/lib/walletToast";
import analyticsService from "@/services/analytics";

/** How long (ms) each pairing code is valid before it expires. */
const QR_TTL_MS = 120_000; // 2 minutes

/** How often (ms) to poll for a completed pairing. */
const POLL_MS = 2_000;

export type QRPairingStatus =
  | "idle"
  | "pending" // code displayed, waiting for scan
  | "scanning" // mobile wallet opened the URI
  | "paired" // handshake complete, publicKey available
  | "expired" // TTL elapsed without pairing
  | "rejected" // mobile wallet explicitly rejected
  | "error"; // unexpected error

export interface QRPairingState {
  status: QRPairingStatus;
  uri: string | null; // the string encoded in the QR
  sessionId: string | null; // unique id for this pairing attempt
  secondsLeft: number; // countdown to expiry
  publicKey: string | null; // set on successful pairing
  errorMessage: string | null;
}

function generateSessionId(): string {
  // crypto.randomUUID is available in all modern browsers and Node ≥ 14.17
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function buildPairingURI(sessionId: string): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://stellarswipe.app";
  // stellarswipe://pair?session=<id>&origin=<origin>
  // Intentionally short to keep QR code small
  return `stellarswipe://pair?s=${sessionId}&o=${encodeURIComponent(origin)}`;
}

/**
 * Simulate polling the pairing API.
 * In production this would be a real fetch to /api/qr-pair?session=<id>.
 * Returns null (still pending), a publicKey string (success),
 * "rejected" or "error" strings.
 */
async function pollPairingStatus(
  sessionId: string
): Promise<"pending" | "rejected" | "error" | string> {
  try {
    const res = await fetch(
      `/api/qr-pair?session=${encodeURIComponent(sessionId)}`,
      { cache: "no-store" }
    );
    if (res.status === 404) return "pending"; // not yet scanned
    if (!res.ok) return "error";
    const json = (await res.json()) as {
      status: "pending" | "scanning" | "paired" | "rejected";
      publicKey?: string;
    };
    if (json.status === "paired" && json.publicKey) return json.publicKey;
    if (json.status === "rejected") return "rejected";
    return "pending";
  } catch {
    // API not implemented yet — keep showing the QR (demo mode)
    return "pending";
  }
}

export function useQRPairing() {
  const { addWallet, setPublicKey, setConnected } = useWalletStore();

  const [state, setState] = useState<QRPairingState>({
    status: "idle",
    uri: null,
    sessionId: null,
    secondsLeft: Math.ceil(QR_TTL_MS / 1000),
    publicKey: null,
    errorMessage: null,
  });

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const clearTimers = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startSession = useCallback(() => {
    clearTimers();

    const sessionId = generateSessionId();
    const uri = buildPairingURI(sessionId);
    sessionIdRef.current = sessionId;

    setState({
      status: "pending",
      uri,
      sessionId,
      secondsLeft: Math.ceil(QR_TTL_MS / 1000),
      publicKey: null,
      errorMessage: null,
    });

    analyticsService.track("qr_pairing_started", { sessionId });

    // Countdown timer
    const startTime = Date.now();
    countdownRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.ceil((QR_TTL_MS - elapsed) / 1000));
      setState((prev) => ({ ...prev, secondsLeft: remaining }));
      if (remaining === 0) {
        clearTimers();
        setState((prev) =>
          prev.status === "pending" || prev.status === "scanning"
            ? {
                ...prev,
                status: "expired",
                errorMessage: "Pairing code expired. Generate a new one.",
              }
            : prev
        );
        analyticsService.track("qr_pairing_expired", { sessionId });
      }
    }, 1_000);

    // Poll for pairing completion
    pollRef.current = setInterval(async () => {
      if (sessionIdRef.current !== sessionId) return; // stale session
      const result = await pollPairingStatus(sessionId);
      if (result === "pending") return;
      clearTimers();
      if (result === "rejected") {
        setState((prev) => ({
          ...prev,
          status: "rejected",
          errorMessage: "Pairing was rejected by the mobile wallet.",
        }));
        analyticsService.track("qr_pairing_rejected", { sessionId });
      } else if (result === "error") {
        setState((prev) => ({
          ...prev,
          status: "error",
          errorMessage: "An error occurred during pairing. Please try again.",
        }));
        analyticsService.track("qr_pairing_error", { sessionId });
      } else {
        // result is a publicKey
        const publicKey = result;
        addWallet(publicKey);
        setPublicKey(publicKey);
        setConnected(true);
        walletToast.connected(publicKey);
        setState((prev) => ({ ...prev, status: "paired", publicKey }));
        analyticsService.track("qr_pairing_success", {
          sessionId,
          wallet_type: "qr",
        });
        window.dispatchEvent(
          new CustomEvent("wallet-connected", { detail: { publicKey } })
        );
      }
    }, POLL_MS);
  }, [clearTimers, addWallet, setPublicKey, setConnected]);

  const cancel = useCallback(() => {
    clearTimers();
    sessionIdRef.current = null;
    setState({
      status: "idle",
      uri: null,
      sessionId: null,
      secondsLeft: Math.ceil(QR_TTL_MS / 1000),
      publicKey: null,
      errorMessage: null,
    });
  }, [clearTimers]);

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), [clearTimers]);

  return {
    ...state,
    ttlMs: QR_TTL_MS,
    startSession,
    regenerate: startSession,
    cancel,
  };
}
