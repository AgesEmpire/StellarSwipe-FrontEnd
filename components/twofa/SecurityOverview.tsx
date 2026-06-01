"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { use2FAStore } from "@/store/use2FAStore";
import { Shield, ShieldCheck, ShieldOff, Smartphone, MessageSquare, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function SecurityOverview() {
  const { isEnabled, method, setWizardOpen, setDisableConfirmOpen, resetWizard, setStep } =
    use2FAStore();

  function handleSetup() {
    resetWizard();
    setStep("intro");
    setWizardOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 2FA Status Card */}
      <Card className={cn(
        "border",
        isEnabled
          ? "border-green-500/30 bg-green-500/5"
          : "border-yellow-500/30 bg-yellow-500/5"
      )}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={cn(
                "rounded-full p-2 mt-0.5",
                isEnabled ? "bg-green-500/20" : "bg-yellow-500/20"
              )}>
                {isEnabled ? (
                  <ShieldCheck className="h-5 w-5 text-green-400" aria-hidden="true" />
                ) : (
                  <ShieldOff className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                )}
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  Two-Factor Authentication
                </p>
                <p className={cn(
                  "text-sm mt-0.5",
                  isEnabled ? "text-green-400" : "text-yellow-400"
                )}>
                  {isEnabled ? "Enabled" : "Not enabled"}
                </p>
                {isEnabled && method && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                    {method === "app" ? (
                      <Smartphone size={13} aria-hidden="true" />
                    ) : (
                      <MessageSquare size={13} aria-hidden="true" />
                    )}
                    <span>
                      {method === "app" ? "Authenticator app" : "SMS backup"}
                    </span>
                  </div>
                )}
                {!isEnabled && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Add an extra layer of security to your account.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {isEnabled ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDisableConfirmOpen(true)}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  aria-label="Disable two-factor authentication"
                >
                  Disable 2FA
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleSetup}
                  aria-label="Set up two-factor authentication"
                >
                  Set Up 2FA
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session timeout reminder */}
      {isEnabled && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
          <Clock className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-medium text-blue-300">Session Timeout Active</p>
            <p className="text-muted-foreground mt-0.5">
              Your session will require 2FA re-verification after 30 minutes of inactivity.
              This helps protect your account even if your device is left unattended.
            </p>
          </div>
        </div>
      )}

      {/* Other security settings */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Security Settings
          </h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {[
            {
              label: "Login Notifications",
              description: "Get notified when your account is accessed from a new device",
              enabled: true,
            },
            {
              label: "Withdrawal Confirmation",
              description: "Require email confirmation for all withdrawals",
              enabled: true,
            },
            {
              label: "API Access",
              description: "Manage API keys and third-party access",
              enabled: false,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-4 py-2 border-b last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
              </div>
              <span
                className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full",
                  item.enabled
                    ? "bg-green-500/15 text-green-400"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {item.enabled ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
