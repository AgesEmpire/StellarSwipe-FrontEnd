import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TwoFAMethod = "app" | "sms";
export type TwoFAStep =
  | "intro"
  | "choose_method"
  | "setup_app"
  | "setup_sms"
  | "verify"
  | "backup_codes"
  | "complete";

export interface TwoFAState {
  isEnabled: boolean;
  method: TwoFAMethod | null;
  /** Current wizard step */
  step: TwoFAStep;
  /** Whether the wizard is open */
  wizardOpen: boolean;
  /** Whether disable-2FA confirmation is open */
  disableConfirmOpen: boolean;
  /** Backup codes (shown once after setup) */
  backupCodes: string[];
  /** Phone number for SMS method */
  phoneNumber: string;
  /** Whether backup codes have been downloaded/acknowledged */
  backupCodesAcknowledged: boolean;

  setStep: (step: TwoFAStep) => void;
  setMethod: (method: TwoFAMethod) => void;
  setWizardOpen: (open: boolean) => void;
  setDisableConfirmOpen: (open: boolean) => void;
  setPhoneNumber: (phone: string) => void;
  enable2FA: (method: TwoFAMethod, codes: string[]) => void;
  disable2FA: () => void;
  acknowledgeBackupCodes: () => void;
  resetWizard: () => void;
}

/** Generates 8 random backup codes */
function generateBackupCodes(): string[] {
  return Array.from({ length: 8 }, () => {
    const part1 = Math.random().toString(36).slice(2, 6).toUpperCase();
    const part2 = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${part1}-${part2}`;
  });
}

export { generateBackupCodes };

export const use2FAStore = create<TwoFAState>()(
  persist(
    (set) => ({
      isEnabled: false,
      method: null,
      step: "intro",
      wizardOpen: false,
      disableConfirmOpen: false,
      backupCodes: [],
      phoneNumber: "",
      backupCodesAcknowledged: false,

      setStep: (step) => set({ step }),
      setMethod: (method) => set({ method }),
      setWizardOpen: (wizardOpen) => set({ wizardOpen }),
      setDisableConfirmOpen: (disableConfirmOpen) => set({ disableConfirmOpen }),
      setPhoneNumber: (phoneNumber) => set({ phoneNumber }),

      enable2FA: (method, codes) =>
        set({
          isEnabled: true,
          method,
          backupCodes: codes,
          backupCodesAcknowledged: false,
          step: "backup_codes",
        }),

      disable2FA: () =>
        set({
          isEnabled: false,
          method: null,
          backupCodes: [],
          backupCodesAcknowledged: false,
          step: "intro",
          disableConfirmOpen: false,
        }),

      acknowledgeBackupCodes: () =>
        set({ backupCodesAcknowledged: true, step: "complete" }),

      resetWizard: () =>
        set({
          step: "intro",
          phoneNumber: "",
          wizardOpen: false,
        }),
    }),
    {
      name: "2fa-store",
      // Don't persist backup codes in plaintext in production — use secure storage
      partialize: (state) => ({
        isEnabled: state.isEnabled,
        method: state.method,
        backupCodesAcknowledged: state.backupCodesAcknowledged,
      }),
    }
  )
);
