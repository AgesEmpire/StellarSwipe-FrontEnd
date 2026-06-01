"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { use2FAStore } from "@/store/use2FAStore";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { X } from "lucide-react";
import { TwoFAStepIntro } from "./steps/TwoFAStepIntro";
import { TwoFAStepChooseMethod } from "./steps/TwoFAStepChooseMethod";
import { TwoFAStepSetupApp } from "./steps/TwoFAStepSetupApp";
import { TwoFAStepSetupSMS } from "./steps/TwoFAStepSetupSMS";
import { TwoFAStepVerify } from "./steps/TwoFAStepVerify";
import { TwoFAStepBackupCodes } from "./steps/TwoFAStepBackupCodes";
import { TwoFAStepComplete } from "./steps/TwoFAStepComplete";

const STEP_LABELS: Record<string, string> = {
  intro: "Introduction",
  choose_method: "Choose Method",
  setup_app: "Set Up App",
  setup_sms: "Set Up SMS",
  verify: "Verify Code",
  backup_codes: "Backup Codes",
  complete: "Complete",
};

const STEP_ORDER = [
  "intro",
  "choose_method",
  "setup_app",
  "setup_sms",
  "verify",
  "backup_codes",
  "complete",
];

function getProgressSteps(method: string | null) {
  if (method === "sms") {
    return ["intro", "choose_method", "setup_sms", "verify", "backup_codes", "complete"];
  }
  return ["intro", "choose_method", "setup_app", "verify", "backup_codes", "complete"];
}

export function TwoFAWizard() {
  const { step, method, setWizardOpen, resetWizard } = use2FAStore();

  const focusTrapRef = useFocusTrap({ isActive: true });

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClose() {
    resetWizard();
    setWizardOpen(false);
  }

  const progressSteps = getProgressSteps(method);
  const currentProgressIndex = progressSteps.indexOf(step);

  return (
    <motion.div
      className="fixed inset-0 z-modal flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <motion.div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="twofa-wizard-title"
        className="relative z-overlay w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl"
        initial={{ scale: 0.93, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 16 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2
              id="twofa-wizard-title"
              className="text-base font-semibold text-foreground"
            >
              Set Up Two-Factor Authentication
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {STEP_LABELS[step] ?? ""}
            </p>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close 2FA setup wizard"
            className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Progress bar */}
        {step !== "complete" && (
          <div className="px-5 pt-4">
            <div className="flex items-center gap-1.5" aria-label="Setup progress" role="progressbar"
              aria-valuenow={currentProgressIndex + 1}
              aria-valuemin={1}
              aria-valuemax={progressSteps.length}
            >
              {progressSteps.map((s, i) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    i <= currentProgressIndex
                      ? "bg-blue-500"
                      : "bg-muted"
                  }`}
                  aria-hidden="true"
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Step {currentProgressIndex + 1} of {progressSteps.length}
            </p>
          </div>
        )}

        {/* Step content */}
        <div className="p-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
            >
              {step === "intro" && <TwoFAStepIntro />}
              {step === "choose_method" && <TwoFAStepChooseMethod />}
              {step === "setup_app" && <TwoFAStepSetupApp />}
              {step === "setup_sms" && <TwoFAStepSetupSMS />}
              {step === "verify" && <TwoFAStepVerify />}
              {step === "backup_codes" && <TwoFAStepBackupCodes />}
              {step === "complete" && <TwoFAStepComplete onClose={handleClose} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
