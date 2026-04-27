"use client";

import {
  isConnected,
  getAddress,
  requestAccess,
} from "@stellar/freighter-api";
import { useWalletStore } from "@/store/useWalletStore";
import { toast } from "sonner";

export function useWallet() {
  const { publicKey, isConnected: connected, setPublicKey, setConnected, disconnect } =
    useWalletStore();

  async function connect() {
    try {
      const freighterConnected = await isConnected();
      if (!freighterConnected) {
        toast.error("Freighter wallet not found. Please install it.");
        return;
      }
      await requestAccess();
      const { address: key } = await getAddress();
      setPublicKey(key);
      setConnected(true);
      toast.success("Wallet connected");
    } catch (err) {
      toast.error("Failed to connect wallet");
      console.error(err);
    }
  }

  function disconnectWallet() {
    disconnect();
    toast.info("Wallet disconnected");
  }

  return { publicKey, connected, connect, disconnect: disconnectWallet };
}
