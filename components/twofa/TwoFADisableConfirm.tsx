"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { use2FAStore } from "@/store/use2FAStore";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { Button } from "@/components/ui/button";
import { ShieldOff, AlertTriangle, Loader2, X } from "lucide-react";

// Mock email confirmation — in production send a real email
const MOCK_CONFIRM_CODE = "DISABLE";

export function TwoFADisableConfirm() {
  const { setDisableConfirmOpen, disable2FA } = use2FAStore();
  const [step, setStep] = useState<"warning" | "confirm">("warning");
  const [inputCode, setInputCode] = useState("");
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [error, setError] = useState("");

  const focusTrapRef = useFocusTrap({ isActive: true });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setDisableConfirmOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setDisableConfirmOpen]);

  async function handleSendEmail() {
    setSending(true);
    await new Promise((r) => setTimeout(r, 800));
    setSending(false);
    setEmailSent(true);
    setStep("confirm");
  }

  async function handleConfirmDisable() {
    if (inputCode.toUpperCase() !== MOCK_CONFIRM_CODE) {
      setError(`Type "${MOCK_CONFIRM_CODE}" to confirm.`);
      return;
    }
    setError("");
    setDisabling(true);
    await new Promise((r) => setTimeout(r, 600));
    disable2FA();
  }

  return (
    <motion.div
      className="fixed inset-0 z-modal flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setDisableConfirmOpen(false)}
        aria-hidden="true"
      />

      <motion.div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="disable-2fa-title"
        className="relative z-overlay w-full max-w-sm rounded-2xl border border-red-500/30 bg-surface shadow-2xl p-5"
        initial={{ scale: 0.93, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 16 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
      >
        {/* Close */}
        <button
          onClick={() => setDisableConfirmOpen(false)}
          aria-label="Cancel"
          className="absolute top-4 right-4 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X size={16} aria-hidden="true" />
        </button>

        {step === "warning" ? (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="rounded-full bg-red-500/10 p-4">
                <ShieldOff className="h-8 w-8 text-red-400" aria-hidden="true" />
              </div>
              <div>
                <h2 id="disable-2fa-title" className="text-base font-bold text-foreground">
                  Disable Two-Factor Authentication?
                </h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  This will remove the extra security layer from your account.
                  Your account will be less secure.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
              <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-yellow-300">
                We'll send a confirmation email before disabling 2FA to verify it's really you.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDisableConfirmOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={sending}
                aria-busy={sending}
                className="flex-1 gap-2 bg-red-600 hover:bg-red-700 text-white border-0"
              >
                {sending ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                ) : null}
                {sending ? "Sending…" : "Send Confirmation Email"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div>
              <h2 id="disable-2fa-title" className="text-base font-bold text-foreground">
                Confirm Disable 2FA
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                A confirmation email has been sent. Type{" "}
                <span className="font-mono font-bold text-foreground">DISABLE</span>{" "}
                below to confirm.
              </p>
            </div>

            <div>
              <label htmlFor="disable-confirm-input" className="text-xs text-muted-foreground mb-1.5 block">
                Type DISABLE to confirm
              </label>
              <input
                id="disable-confirm-input"
                type="text"
                value={inputCode}
                onChange={(e) => {
                  setInputCode(e.target.value);
                  setError("");
                }}
                placeholder="DISABLE"
                aria-describedby={error ? "disable-error" : undefined}
                aria-invalid={!!error}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm font-mono text-foreground placeholder-foreground-subtle focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {error && (
                <p id="disable-error" role="alert" className="mt-1 text-xs text-red-400">
                  {error}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDisableConfirmOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDisable}
                disabled={!inputCode || disabling}
                aria-busy={disabling}
                className="flex-1 gap-2 bg-red-600 hover:bg-red-700 text-white border-0"
              >
                {disabling ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                ) : null}
                {disabling ? "Disabling…" : "Disable 2FA"}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
