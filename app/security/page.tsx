"use client";

import { useState } from "react";
import { Shield, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TwoFactorSetupWizard, DisableTwoFactor } from "@/components/TwoFactorSetupWizard";
import { AccountDeletionDialog } from "@/components/AccountDeletionDialog";
import { useWalletStore } from "@/store/useWalletStore";

export default function SecuritySettingsPage() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showDeletion, setShowDeletion] = useState(false);

  const publicKey = useWalletStore((s) => s.publicKey);
  const disconnect = useWalletStore((s) => s.disconnect);

  function handleSetupComplete() {
    setTwoFactorEnabled(true);
    setShowSetup(false);
  }

  function handleDeleted() {
    // Sign the user out after confirmed deletion
    disconnect();
    setShowDeletion(false);
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-8 lg:px-8 text-foreground">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-blue-400" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-foreground">Account Security</h1>
        </div>

        {/* 2FA status card */}
        {!showSetup && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  Two-Factor Authentication
                </h2>
                <span
                  aria-label={twoFactorEnabled ? "2FA enabled" : "2FA disabled"}
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    twoFactorEnabled
                      ? "bg-green-500/15 text-green-400"
                      : "bg-foreground-muted/10 text-foreground-muted"
                  }`}
                >
                  {twoFactorEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <p className="text-xs text-foreground-muted">
                {twoFactorEnabled
                  ? "Your account is protected with two-factor authentication."
                  : "Add an extra layer of security to your account by requiring a verification code on sign-in."}
              </p>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              {!twoFactorEnabled ? (
                <Button
                  size="sm"
                  onClick={() => setShowSetup(true)}
                  className="gap-1.5"
                  aria-label="Set up two-factor authentication"
                >
                  Set up 2FA <ChevronRight size={13} />
                </Button>
              ) : (
                <DisableTwoFactor
                  onDisabled={() => setTwoFactorEnabled(false)}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Setup wizard */}
        {showSetup && (
          <TwoFactorSetupWizard
            accountEmail="user@stellarswipe.app"
            onComplete={handleSetupComplete}
            onCancel={() => setShowSetup(false)}
          />
        )}

        {/* ── Danger Zone ───────────────────────────────────────────────────── */}
        {!showSetup && (
          <Card className="border-red-500/30">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trash2 size={15} className="text-red-400" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-red-400">Danger Zone</h2>
              </div>
              <p className="text-xs text-foreground-muted">
                Actions in this section are irreversible. Proceed with caution.
              </p>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              {/* Account deletion row */}
              <div className="flex flex-col gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">Delete Account</p>
                  <p className="text-xs text-foreground-muted">
                    Permanently deactivate your account. Financial and audit records
                    are anonymised and retained per our 7-year retention policy.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setShowDeletion(true)}
                  disabled={!publicKey}
                  aria-label="Open account deletion dialog"
                  className="shrink-0 gap-1.5"
                  title={
                    !publicKey
                      ? "Connect your wallet to delete your account"
                      : undefined
                  }
                >
                  <Trash2 size={13} aria-hidden="true" />
                  Delete Account
                </Button>
              </div>

              {!publicKey && (
                <p className="text-xs text-yellow-400" role="note">
                  You must connect your Freighter wallet before you can delete your account.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Account Deletion Dialog */}
      <AccountDeletionDialog
        open={showDeletion}
        publicKey={publicKey ?? ""}
        onClose={() => setShowDeletion(false)}
        onDeleted={handleDeleted}
      />
    </main>
  );
}
