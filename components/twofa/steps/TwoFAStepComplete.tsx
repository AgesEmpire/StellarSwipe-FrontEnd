"use client";

import { Button } from "@/components/ui/button";
import { use2FAStore } from "@/store/use2FAStore";
import { ShieldCheck, Smartphone, MessageSquare } from "lucide-react";

interface TwoFAStepCompleteProps {
  onClose: () => void;
}

export function TwoFAStepComplete({ onClose }: TwoFAStepCompleteProps) {
  const { method } = use2FAStore();

  return (
    <div className="flex flex-col items-center gap-5 text-center py-2">
      <div className="rounded-full bg-green-500/10 p-5">
        <ShieldCheck className="h-10 w-10 text-green-400" aria-hidden="true" />
      </div>

      <div>
        <h3 className="text-lg font-bold text-foreground">2FA Enabled!</h3>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Your account is now protected with two-factor authentication.
          You'll be asked for a verification code each time you sign in.
        </p>
      </div>

      {/* Method summary */}
      <div className="w-full rounded-lg border border-green-500/20 bg-green-500/5 p-4">
        <div className="flex items-center justify-center gap-2 text-sm text-green-300">
          {method === "app" ? (
            <Smartphone size={16} aria-hidden="true" />
          ) : (
            <MessageSquare size={16} aria-hidden="true" />
          )}
          <span>
            {method === "app"
              ? "Authenticator app is your primary 2FA method"
              : "SMS is your primary 2FA method"}
          </span>
        </div>
      </div>

      {/* What's next */}
      <div className="w-full text-left rounded-lg border border-border bg-muted/20 p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          What's next
        </p>
        <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">✓</span>
            Your backup codes are saved — keep them secure
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">✓</span>
            Sessions will timeout after 30 minutes of inactivity
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">✓</span>
            You can disable 2FA anytime from Security Settings
          </li>
        </ul>
      </div>

      <Button onClick={onClose} className="w-full">
        Done
      </Button>
    </div>
  );
}
