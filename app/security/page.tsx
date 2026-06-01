"use client";

import { PageTransition } from "@/components/PageTransition";
import { SecurityOverview } from "@/components/twofa/SecurityOverview";
import { TwoFAWizard } from "@/components/twofa/TwoFAWizard";
import { TwoFADisableConfirm } from "@/components/twofa/TwoFADisableConfirm";
import { use2FAStore } from "@/store/use2FAStore";
import { Shield } from "lucide-react";

export default function SecurityPage() {
  const { wizardOpen, disableConfirmOpen } = use2FAStore();

  return (
    <PageTransition>
      <main className="flex min-h-screen flex-col gap-6 p-4 sm:gap-8 sm:p-8 bg-gray-950 max-w-2xl mx-auto w-full">
        {/* Header */}
        <header className="flex items-center gap-3">
          <div className="rounded-lg bg-green-500/10 p-2">
            <Shield className="h-5 w-5 text-green-400" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Account Security
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Manage your two-factor authentication and security settings
            </p>
          </div>
        </header>

        {/* Security overview + 2FA status */}
        <SecurityOverview />

        {/* 2FA Setup Wizard (modal) */}
        {wizardOpen && <TwoFAWizard />}

        {/* Disable 2FA confirmation (modal) */}
        {disableConfirmOpen && <TwoFADisableConfirm />}
      </main>
    </PageTransition>
  );
}
