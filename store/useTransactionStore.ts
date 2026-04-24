import { create } from "zustand";

export interface TransactionDetails {
  hash: string;
  amount: string;
  price: string;
  fee: string;
  token: string;
  timestamp: number;
}

export interface TransactionError {
  message: string;
  code?: string;
  reason?: string;
}

interface TransactionState {
  // Success state
  success: TransactionDetails | null;
  showSuccess: boolean;
  // Failure state
  error: TransactionError | null;
  showError: boolean;
  // Preserved input state for retry
  preservedInput: Record<string, unknown> | null;

  setSuccess: (details: TransactionDetails) => void;
  clearSuccess: () => void;
  setError: (error: TransactionError) => void;
  clearError: () => void;
  setPreservedInput: (input: Record<string, unknown> | null) => void;
  reset: () => void;
}

export const useTransactionStore = create<TransactionState>()((set) => ({
  success: null,
  showSuccess: false,
  error: null,
  showError: false,
  preservedInput: null,

  setSuccess: (details) =>
    set({ success: details, showSuccess: true, error: null, showError: false }),

  clearSuccess: () =>
    set({ success: null, showSuccess: false }),

  setError: (error) =>
    set({ error, showError: true, success: null, showSuccess: false }),

  clearError: () =>
    set({ error: null, showError: false }),

  setPreservedInput: (input) =>
    set({ preservedInput: input }),

  reset: () =>
    set({
      success: null,
      showSuccess: false,
      error: null,
      showError: false,
      preservedInput: null,
    }),
}));
