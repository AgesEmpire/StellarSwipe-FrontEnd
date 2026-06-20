import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  createPersistedState,
  type PersistHydrationState,
  withPersistedHydration,
} from "./persistHydration";

interface WalletState extends PersistHydrationState {
  publicKey: string | null;
  isConnected: boolean;
  network: string;
  setPublicKey: (key: string | null) => void;
  setConnected: (connected: boolean) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      ...createPersistedState<WalletState>(set),
      publicKey: null,
      isConnected: false,
      network: "TESTNET",
      setPublicKey: (key) => set({ publicKey: key }),
      setConnected: (connected) => set({ isConnected: connected }),
      disconnect: () => set({ publicKey: null, isConnected: false }),
    }),
    withPersistedHydration({ name: "wallet-store" })
  )
);
