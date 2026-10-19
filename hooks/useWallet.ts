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
import { AUDIT_ACTIONS, recordAuditEntry } from "@/services/auditTrail";
import type { WalletConnectErrorReason } from "@/components/WalletConnectErrorModal";

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
    setPublicKey,
    setConnected,
    disconnect,
  } = useWalletStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [connectError, setConnectError] = useState<WalletConnectErrorReason>(null);

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
        analyticsService.track('wallet_connect_failed', {
          wallet_type: 'freighter',
          reason: 'not_found',
        });
        return;
      }
      await requestAccess();
      const result = await getAddress();
      const key = typeof result === "string" ? result : result.address;
      setPublicKey(key);
      setConnected(true);
      walletToast.connected(key);
      analyticsService.track('wallet_connected', {
        wallet_type: 'freighter',
      });
      window.dispatchEvent(
        new CustomEvent("wallet-connected", { detail: { publicKey: key } })
      );
    } catch (err) {
      if (isUserRejection(err)) {
        walletToast.denied();
        analyticsService.track('wallet_connect_failed', {
          wallet_type: 'freighter',
          reason: 'user_rejected',
        });
      } else {
        walletToast.connectError();
        setConnectError("error");
        console.error(err);
        analyticsService.track('wallet_connect_failed', {
          wallet_type: 'freighter',
          reason: 'error',
        });
      }
    } finally {
      setIsConnecting(false);
    }
  }

  async function sign(transactionXdr: string, networkPassphrase?: string): Promise<string> {
    if (!connected || !publicKey) {
      throw new Error("Wallet not connected");
    }
    setIsSigning(true);
    const passphrase = networkPassphrase ?? NETWORK_PASSPHRASE;
    try {
      const result = await signTransaction(transactionXdr, {
        networkPassphrase: passphrase,
        address: publicKey,
      });
      // Sensitive action — audit it. Neither the XDR nor the resulting
      // signature is recorded.
      recordAuditEntry({
        actor: publicKey,
        action: AUDIT_ACTIONS.TRANSACTION_SIGNED,
        target: publicKey,
        metadata: { networkPassphrase: passphrase },
      });
      return typeof result === "string" ? result : result.signedTxXdr;
    } catch (err) {
      recordAuditEntry({
        actor: publicKey,
        action: AUDIT_ACTIONS.TRANSACTION_SIGN_FAILED,
        target: publicKey,
        metadata: {
          networkPassphrase: passphrase,
          reason: isUserRejection(err) ? "user_rejected" : "error",
        },
      });
      if (isUserRejection(err)) {
        walletToast.signingDenied();
        throw err;
      }
      walletToast.signError();
      console.error(err);
      throw err;
    } finally {
      setIsSigning(false);
    }
  }

  function disconnectWallet() {
    disconnect();
    walletToast.disconnected();
    window.dispatchEvent(new CustomEvent("wallet-disconnected"));
  }

  return {
    publicKey,
    connected,
    connect,
    disconnect: disconnectWallet,
    sign,
    isConnecting,
    isSigning,
    connectError,
    clearConnectError,
  };
}
