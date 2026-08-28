"use client";

import { ReactNode } from "react";
import { Bell, Globe2, LayoutGrid, Moon, Palette, Wallet2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccentColorPicker } from "@/components/AccentColorPicker";
import { CurrencySelector } from "@/components/CurrencySelector";
import { FeedDensityToggle } from "@/components/FeedDensityToggle";
import { DataSaverToggle } from "@/components/DataSaverToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { NotificationManageMenu } from "@/components/NotificationManageMenu";
import { useCurrencyStore } from "@/store/useCurrencyStore";
import { useFeedDensityStore } from "@/store/useFeedDensityStore";
import { useThemeStore } from "@/store/useThemeStore";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { useGuidedTourStore } from "@/store/useGuidedTourStore";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface PreferencesSectionProps {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}

function PreferencesSection({
  icon,
  title,
  description,
  children,
}: PreferencesSectionProps) {
  return (
    <section className="rounded-2xl border border-border bg-surface/40 p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-foreground-muted">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-foreground-muted">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/**
 * Single destination for display and notification preferences. Every
 * control here reads from and writes to the same persisted stores used
 * elsewhere in the app (theme, currency, density, data saver, notifications),
 * so changes take effect immediately and stay in sync across every surface
 * that reads them — this page doesn't introduce a second source of truth.
 */
export function PreferencesHub() {
  const { theme, accentColor } = useThemeStore();
  const { currency } = useCurrencyStore();
  const { density } = useFeedDensityStore();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-xl font-bold text-foreground">Preferences</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Manage how StellarSwipe looks and how it notifies you. Every change
          here applies immediately and is remembered on this device.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-foreground/[0.03] p-3 text-xs text-foreground-muted">
        <span className="font-medium text-foreground">Currently:</span>
        <span>{theme === "dark" ? "Dark" : "Light"} theme</span>
        <span aria-hidden="true">·</span>
        <span>{accentColor ? "Custom accent" : "Default accent"}</span>
        <span aria-hidden="true">·</span>
        <span>{currency} display</span>
        <span aria-hidden="true">·</span>
        <span>{density === "compact" ? "Compact" : "Comfortable"} feed</span>
      </div>

      <PreferencesSection
        icon={<Moon size={16} aria-hidden="true" />}
        title="Appearance"
        description="Theme and accent color for the whole app."
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-foreground">Theme</p>
            <p className="text-xs text-foreground-muted">
              Switch between light and dark mode.
            </p>
          </div>
          <ThemeToggle />
        </div>
        <div className="border-t border-border pt-4">
          <AccentColorPicker />
        </div>
      </PreferencesSection>

      <PreferencesSection
        icon={<LayoutGrid size={16} aria-hidden="true" />}
        title="Display density"
        description="Control how much information is visible per screen."
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-foreground">Signal feed density</p>
            <p className="text-xs text-foreground-muted">
              Compact fits more signals on screen; comfortable adds breathing room.
            </p>
          </div>
          <FeedDensityToggle />
        </div>
        <div className="border-t border-border pt-4">
          <DataSaverToggle />
        </div>
      </PreferencesSection>

      <PreferencesSection
        icon={<Wallet2 size={16} aria-hidden="true" />}
        title="Currency"
        description="Choose the currency used to display prices and P&L."
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-foreground">Display currency</p>
            <p className="text-xs text-foreground-muted">
              Applies across the dashboard, signals, and journal.
            </p>
          </div>
          <CurrencySelector />
        </div>
      </PreferencesSection>

      <PreferencesSection
        icon={<Globe2 size={16} aria-hidden="true" />}
        title="Language"
        description="Set your preferred display language."
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-foreground">App language</p>
            <p className="text-xs text-foreground-muted">
              Translations apply immediately, no reload required.
            </p>
          </div>
          <LanguageSelector />
        </div>
      </PreferencesSection>

      <PreferencesSection
        icon={<Bell size={16} aria-hidden="true" />}
        title="Notifications"
        description="Control push notification permission and categories."
      >
        <NotificationManageMenu />
      </PreferencesSection>

      <PreferencesSection
        icon={<Palette size={16} aria-hidden="true" />}
        title="Onboarding"
        description="Revisit the guided tour of core features."
      >
        <ReplayOnboardingRow />
      </PreferencesSection>
    </div>
  );
}

function ReplayOnboardingRow() {
  const reset = useOnboardingStore((s) => s.reset);
  const replayTour = useGuidedTourStore((s) => s.replay);

  const handleReplay = () => {
    reset();
    replayTour();
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-medium text-foreground">Guided tour</p>
        <p className="text-xs text-foreground-muted">
          Replays the intro walkthrough and the contextual spotlight tour of
          the wallet, signal feed, and comparison view.
        </p>
      </div>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={handleReplay}>
        <RotateCcw size={13} aria-hidden="true" />
        Replay tour
      </Button>
    </div>
  );
}
