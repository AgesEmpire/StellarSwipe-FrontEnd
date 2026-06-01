"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { use2FAStore } from "@/store/use2FAStore";
import { MessageSquare, ChevronRight, Send } from "lucide-react";

const COUNTRY_CODES = [
  { code: "+1", label: "US/CA (+1)" },
  { code: "+44", label: "UK (+44)" },
  { code: "+49", label: "DE (+49)" },
  { code: "+33", label: "FR (+33)" },
  { code: "+61", label: "AU (+61)" },
  { code: "+81", label: "JP (+81)" },
  { code: "+91", label: "IN (+91)" },
];

export function TwoFAStepSetupSMS() {
  const { phoneNumber, setPhoneNumber, setStep } = use2FAStore();
  const [countryCode, setCountryCode] = useState("+1");
  const [localNumber, setLocalNumber] = useState(phoneNumber.replace(/^\+\d+\s?/, ""));
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const fullNumber = `${countryCode} ${localNumber}`.trim();
  const isValid = localNumber.replace(/\D/g, "").length >= 7;

  async function handleSendCode() {
    if (!isValid) {
      setError("Please enter a valid phone number.");
      return;
    }
    setError("");
    setSending(true);
    // Simulate SMS send
    await new Promise((r) => setTimeout(r, 1000));
    setPhoneNumber(fullNumber);
    setSending(false);
    setSent(true);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-base font-semibold text-foreground">Add Your Phone Number</h3>
        <p className="text-sm text-muted-foreground mt-1">
          We'll send a verification code to this number. Standard SMS rates may apply.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {/* Country code + number */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">
            Phone Number
          </label>
          <div className="flex gap-2">
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              aria-label="Country code"
              className="rounded-lg border border-border bg-input px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring w-32 flex-shrink-0"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              type="tel"
              value={localNumber}
              onChange={(e) => {
                setLocalNumber(e.target.value);
                setError("");
                setSent(false);
              }}
              placeholder="555 000 0000"
              aria-label="Phone number"
              aria-describedby={error ? "phone-error" : undefined}
              aria-invalid={!!error}
              className="flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder-foreground-subtle focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {error && (
            <p id="phone-error" role="alert" className="mt-1 text-xs text-red-400">
              {error}
            </p>
          )}
        </div>

        {/* Send code button */}
        <Button
          variant="outline"
          onClick={handleSendCode}
          disabled={!isValid || sending}
          aria-busy={sending}
          className="gap-2 self-start"
        >
          {sending ? (
            <>Sending…</>
          ) : sent ? (
            <>
              <Send size={14} aria-hidden="true" />
              Resend Code
            </>
          ) : (
            <>
              <Send size={14} aria-hidden="true" />
              Send Verification Code
            </>
          )}
        </Button>

        {sent && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm"
          >
            <MessageSquare className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-green-300">
              Code sent to <span className="font-mono font-semibold">{fullNumber}</span>.
              Enter it on the next step.
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep("choose_method")} className="flex-1">
          Back
        </Button>
        <Button
          onClick={() => setStep("verify")}
          disabled={!sent}
          className="flex-1 gap-2"
        >
          Continue
          <ChevronRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
