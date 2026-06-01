"use client";

import { Button } from "@/components/ui/button";
import { use2FAStore } from "@/store/use2FAStore";
import { ShieldCheck, Smartphone, MessageSquare, Key } from "lucide-react";

export function TwoFAStepIntro() {
  const { setStep } = use2FAStore();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3 text-center py-2">
        <div className="rounded-full bg-blue-500/10 p-4">
          <ShieldCheck className="h-8 w-8 text-blue-400" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Protect Your Account
          </h3>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Two-factor authentication adds a second layer of security. Even if
            someone gets your password, they won't be able to access your account
            without your second factor.
          </p>
        </div>
      </div>

      {/* What you'll need */}
      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          What you'll set up
        </p>
        <ul className="flex flex-col gap-3">
          {[
            {
              icon: Smartphone,
              title: "Authenticator App",
              desc: "Google Authenticator, Authy, or any TOTP app",
            },
            {
              icon: MessageSquare,
              title: "SMS Backup",
              desc: "Phone number for account recovery",
            },
            {
              icon: Key,
              title: "Backup Codes",
              desc: "One-time codes in case you lose access",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.title} className="flex items-start gap-3">
                <div className="rounded-md bg-blue-500/10 p-1.5 mt-0.5">
                  <Icon className="h-4 w-4 text-blue-400" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <Button onClick={() => setStep("choose_method")} className="w-full">
        Get Started
      </Button>
    </div>
  );
}
