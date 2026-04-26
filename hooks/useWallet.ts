"use client";

import { useState } from "react";
import {
  isConnected,
  getAddress,
  requestAccess,
} from "@stellar/freighter-api";
import { useWalletStore } from "@/store/useWalletStore";
import { toast } from "@/lib/toast";

export function useWallet() {
  const { publicKey, isConnected: connected, setPublicKey, setConnected, disconnect } =
    useWalletStore();
  const [isConnecting, setIsConnecting] = useState(false);

  async function connect() {
    try {
      setIsConnecting(true);
      const connectedResponse = await isConnected();
      if (!connectedResponse?.isConnected) {
        toast.error("Freighter wallet not found. Please install it.");
        return;
      }
      await requestAccess();
      const result = await getAddress();
      const key = typeof result === "string" ? result : result.address;
      setPublicKey(key);
      setConnected(true);
      toast.success("Wallet connected");
    } catch (err) {
      toast.error("Failed to connect wallet");
      console.error(err);
    } finally {
      setIsConnecting(false);
    }
  }

  function disconnectWallet() {
    disconnect();
    toast.info("Wallet disconnected");
  }

  return { publicKey, connected, connect, disconnect: disconnectWallet, isConnecting };
}
