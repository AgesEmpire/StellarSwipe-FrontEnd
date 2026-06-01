"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { use2FAStore, generateBackupCodes } from "@/store/use2FAStore";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

// Mock valid code for demo — in production verify against TOTP server
const MOCK_VALID_CODE = "123456";

export function TwoFAStepVerify() {
  const { method, setStep, enable2FA } = use2FAStore();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first input
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const code = digits.join("");
  const isComplete = code.length === 6;

  function handleDigitChange(index: number, value: string) {
    // Accept only digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setStatus("idle");

    // Auto-advance
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setDigits(next);
    // Focus last filled or next empty
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  }

  async function handleVerify() {
    if (!isComplete) return;
    setStatus("verifying");
    await new Promise((r) => setTimeout(r, 800));

    if (code === MOCK_VALID_CODE || code.length === 6) {
      // Accept any 6-digit code in demo mode
      setStatus("success");
      await new Promise((r) => setTimeout(r, 600));
      const codes = generateBackupCodes();
      enable2FA(method ?? "app", codes);
    } else {
      setStatus("error");
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  }

  const prevStep = method === "app" ? "setup_app" : "setup_sms";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-base font-semibold text-foreground">Enter Verification Code</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {method === "app"
            ? "Enter the 6-digit code from your authenticator app."
            : "Enter the 6-digit code we sent to your phone."}
        </p>
        {method === "app" && (
          <p className="text-xs text-muted-foreground mt-1">
            Demo hint: enter any 6 digits to proceed.
          </p>
        )}
      </div>

      {/* OTP input */}
      <div
        className="flex justify-center gap-2"
        role="group"
        aria-label="6-digit verification code"
      >
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleDigitChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            aria-label={`Digit ${i + 1}`}
            className={cn(
              "h-12 w-10 rounded-lg border text-center text-lg font-bold font-mono transition-all",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              status === "error"
                ? "border-red-500 bg-red-500/10 text-red-400"
                : status === "success"
                ? "border-green-500 bg-green-500/10 text-green-400"
                : d
                ? "border-blue-500 bg-blue-500/10 text-foreground"
                : "border-border bg-input text-foreground"
            )}
          />
        ))}
      </div>

      {/* Status feedback */}
      {status === "error" && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
        >
          <XCircle size={16} aria-hidden="true" />
          Incorrect code. Please try again.
        </div>
      )}
      {status === "success" && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400"
        >
          <CheckCircle size={16} aria-hidden="true" />
          Code verified successfully!
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep(prevStep)} className="flex-1">
          Back
        </Button>
        <Button
          onClick={handleVerify}
          disabled={!isComplete || status === "verifying" || status === "success"}
          aria-busy={status === "verifying"}
          className="flex-1 gap-2"
        >
          {status === "verifying" ? (
            <>
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
              Verifying…
            </>
          ) : (
            "Verify Code"
          )}
        </Button>
      </div>
    </div>
  );
}
