import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  AUDIT_ACTIONS,
  recordAuditEntry,
} from "@/services/auditTrail";

interface WalletState {
  publicKey: string | null;
  isConnected: boolean;
  network: string;
  setPublicKey: (key: string | null) => void;
  setConnected: (connected: boolean) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      publicKey: null,
      isConnected: false,
      network: "TESTNET",
      setPublicKey: (key) => {
        if (key && key !== get().publicKey) {
          // Sensitive account change — audit (public keys are not secrets).
          recordAuditEntry({
            actor: key,
            action: AUDIT_ACTIONS.WALLET_CONNECTED,
            target: key,
            metadata: { network: get().network },
          });
        }
        set({ publicKey: key });
      },
      setConnected: (connected) => set({ isConnected: connected }),
      disconnect: () => {
        const previous = get().publicKey;
        if (previous) {
          // Sensitive account change — audit.
          recordAuditEntry({
            actor: previous,
            action: AUDIT_ACTIONS.WALLET_DISCONNECTED,
            target: previous,
          });
        }
        set({ publicKey: null, isConnected: false });
      },
    }),
    { name: "wallet-store" }
  )
);
