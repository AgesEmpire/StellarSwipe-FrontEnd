"use client";

import { Button } from "@/components/ui/button";
import { use2FAStore, type TwoFAMethod } from "@/store/use2FAStore";
import { cn } from "@/lib/utils";
import { Smartphone, MessageSquare, ChevronRight } from "lucide-react";

const METHODS: {
  value: TwoFAMethod;
  label: string;
  description: string;
  icon: typeof Smartphone;
  recommended?: boolean;
}[] = [
  {
    value: "app",
    label: "Authenticator App",
    description:
      "Use Google Authenticator, Authy, or any TOTP-compatible app. More secure and works offline.",
    icon: Smartphone,
    recommended: true,
  },
  {
    value: "sms",
    label: "SMS (Text Message)",
    description:
      "Receive a one-time code via text message. Requires a valid phone number.",
    icon: MessageSquare,
  },
];

export function TwoFAStepChooseMethod() {
  const { method, setMethod, setStep } = use2FAStore();

  function handleContinue() {
    if (!method) return;
    setStep(method === "app" ? "setup_app" : "setup_sms");
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-base font-semibold text-foreground">Choose Your Method</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Select how you'd like to receive your verification codes.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="2FA method selection"
        className="flex flex-col gap-3"
      >
        {METHODS.map((m) => {
          const Icon = m.icon;
          const selected = method === m.value;
          return (
            <button
              key={m.value}
              role="radio"
              aria-checked={selected}
              onClick={() => setMethod(m.value)}
              className={cn(
                "flex items-start gap-4 rounded-xl border p-4 text-left transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-border bg-card hover:border-border-strong"
              )}
            >
              <div className={cn(
                "rounded-lg p-2 mt-0.5",
                selected ? "bg-blue-500/20" : "bg-muted/50"
              )}>
                <Icon
                  className={cn("h-5 w-5", selected ? "text-blue-400" : "text-muted-foreground")}
                  aria-hidden="true"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{m.label}</p>
                  {m.recommended && (
                    <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {m.description}
                </p>
              </div>
              <div className={cn(
                "mt-1 h-4 w-4 rounded-full border-2 flex-shrink-0",
                selected ? "border-blue-500 bg-blue-500" : "border-muted-foreground"
              )} aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep("intro")} className="flex-1">
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!method}
          className="flex-1 gap-2"
        >
          Continue
          <ChevronRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
