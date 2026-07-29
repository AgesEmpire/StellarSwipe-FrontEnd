"use client";

import { useState } from "react";
import {
  isConnected,
  getAddress,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";
import { useWalletStore } from "@/store/useWalletStore";
import { NETWORK_PASSPHRASE } from "@/lib/stellar";
import { walletToast } from "@/lib/walletToast";
import { traceWorker } from "@/src/tracing/worker-tracing.service";
import analyticsService from "@/services/analytics";
import type { WalletConnectErrorReason } from "@/components/WalletConnectErrorModal";
import * as Sentry from "@sentry/nextjs";

function isUserRejection(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("rejected") ||
    msg.includes("denied") ||
    msg.includes("cancelled") ||
    msg.includes("canceled") ||
    msg.includes("declined") ||
    msg.includes("user rejected")
  );
}

export function useWallet() {
  const {
    publicKey,
    isConnected: connected,
    wallets,
    activePublicKey,
    setPublicKey,
    setConnected,
    disconnect,
    setActiveWallet,
    disconnectAll,
  } = useWalletStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [connectError, setConnectError] =
    useState<WalletConnectErrorReason>(null);

  function clearConnectError() {
    setConnectError(null);
  }

  async function connect() {
    try {
      setIsConnecting(true);
      setConnectError(null);
      const connectedResponse = await isConnected();
      if (!connectedResponse?.isConnected) {
        walletToast.notFound();
        setConnectError("not_found");
        analyticsService.track("wallet_connect_failed", {
          wallet_type: "freighter",
          reason: "not_found",
        });
        return;
      }
      await requestAccess();
      const result = await getAddress();
      const key = typeof result === "string" ? result : result.address;
      setPublicKey(key);
      setConnected(true);
      walletToast.connected(key);
      analyticsService.track("wallet_connected", {
        wallet_type: "freighter",
      });
      window.dispatchEvent(
        new CustomEvent("wallet-connected", { detail: { publicKey: key } })
      );
    } catch (err) {
      if (isUserRejection(err)) {
        walletToast.denied();
        analyticsService.track("wallet_connect_failed", {
          wallet_type: "freighter",
          reason: "user_rejected",
        });
      } else {
        walletToast.connectError();
        setConnectError("error");
        Sentry.captureException(err);
        analyticsService.track("wallet_connect_failed", {
          wallet_type: "freighter",
          reason: "error",
        });
      }
    } finally {
      setIsConnecting(false);
    }
  }

  async function sign(
    transactionXdr: string,
    networkPassphrase?: string
  ): Promise<string> {
    if (!connected || !publicKey) {
      throw new Error("Wallet not connected");
    }
    setIsSigning(true);
    try {
      const result = await signTransaction(transactionXdr, {
        networkPassphrase: networkPassphrase ?? NETWORK_PASSPHRASE,
        address: publicKey,
      });
      return typeof result === "string" ? result : result.signedTxXdr;
    } catch (err) {
      if (isUserRejection(err)) {
        walletToast.signingDenied();
        throw err;
      }
      walletToast.signError();
      Sentry.captureException(err);
      throw err;
    } finally {
      setIsSigning(false);
    }
  }

  async function connectAnother() {
    try {
      setIsConnecting(true);
      setConnectError(null);
      const connectedResponse = await isConnected();
      if (!connectedResponse?.isConnected) {
        walletToast.notFound();
        setConnectError("not_found");
        return;
      }
      await requestAccess();
      const result = await getAddress();
      const key = typeof result === "string" ? result : result.address;
      setPublicKey(key);
      walletToast.connected(key);
      analyticsService.track("wallet_connected", { wallet_type: "freighter" });
      window.dispatchEvent(
        new CustomEvent("wallet-connected", { detail: { publicKey: key } })
      );
    } catch (err) {
      if (isUserRejection(err)) {
        walletToast.denied();
      } else {
        walletToast.connectError();
        setConnectError("error");
        Sentry.captureException(err);
      }
    } finally {
      setIsConnecting(false);
    }
  }

  function switchWallet(key: string) {
    setActiveWallet(key);
    window.dispatchEvent(
      new CustomEvent("wallet-connected", { detail: { publicKey: key } })
    );
  }

  function disconnectWallet() {
    disconnect();
    walletToast.disconnected();
    window.dispatchEvent(new CustomEvent("wallet-disconnected"));
  }

  function disconnectAllWallets() {
    disconnectAll();
    walletToast.disconnected();
    window.dispatchEvent(new CustomEvent("wallet-disconnected"));
  }

  return {
    publicKey,
    connected,
    wallets,
    activePublicKey,
    connect,
    connectAnother,
    switchWallet,
    disconnect: disconnectWallet,
    disconnectAll: disconnectAllWallets,
    sign,
    isConnecting,
    isSigning,
    connectError,
    clearConnectError,
  };
}
