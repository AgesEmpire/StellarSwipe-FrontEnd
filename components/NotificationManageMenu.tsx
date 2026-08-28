"use client";

import { useState } from "react";
import { Bell, BellOff, BellRing, ExternalLink, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useNotificationPreference,
  type NotificationCategory,
} from "@/hooks/useNotificationPreference";
import { requestNotificationPermission } from "@/lib/notifications";

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  priceAlerts: "Price alerts",
  newSignals: "New signals",
  systemUpdates: "System updates",
};

const CATEGORY_DESCRIPTIONS: Record<NotificationCategory, string> = {
  priceAlerts: "Notify me when a watched asset crosses a price threshold.",
  newSignals: "Notify me when a followed provider posts a new signal.",
  systemUpdates: "Notify me about account, security, and maintenance updates.",
};

function statusMeta(status: NotificationPermission) {
  switch (status) {
    case "granted":
      return {
        label: "Enabled",
        tone: "text-emerald-500",
        icon: BellRing,
        description: "This device can receive push notifications.",
      };
    case "denied":
      return {
        label: "Blocked",
        tone: "text-destructive",
        icon: ShieldAlert,
        description:
          "Notifications are blocked at the browser level. Update your browser's site settings to re-enable.",
      };
    default:
      return {
        label: "Not enabled",
        tone: "text-foreground-muted",
        icon: BellOff,
        description: "You haven't turned on notifications for this device yet.",
      };
  }
}

/**
 * Discoverable, single place to see notification status, manage per-category
 * preferences, and understand how to revoke access. Meant to live in the
 * preferences hub so users always know where to find it.
 */
export function NotificationManageMenu() {
  const {
    alertsEnabled,
    toggleAlerts,
    categoryPreferences,
    toggleCategory,
    permissionStatus,
    setPermissionStatus,
    deniedMessage,
    showDeniedMessage,
  } = useNotificationPreference();
  const [requesting, setRequesting] = useState(false);

  const meta = statusMeta(permissionStatus);
  const StatusIcon = meta.icon;

  const handleRequestPermission = async () => {
    setRequesting(true);
    try {
      const result = await requestNotificationPermission();
      setPermissionStatus(result);
      if (result === "granted") {
        toggleAlerts(true);
      } else if (result === "denied") {
        showDeniedMessage();
      }
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-foreground/5 ${meta.tone}`}>
            <StatusIcon size={16} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Push notifications</p>
            <p className={`text-xs font-medium ${meta.tone}`}>{meta.label}</p>
          </div>
        </div>

        {permissionStatus === "default" && (
          <Button size="sm" onClick={handleRequestPermission} disabled={requesting}>
            {requesting ? "Requesting…" : "Enable"}
          </Button>
        )}
      </div>

      <p className="mt-2 text-xs leading-5 text-foreground-muted">{meta.description}</p>

      {deniedMessage && (
        <div
          role="alert"
          className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
        >
          <ShieldAlert size={13} aria-hidden="true" />
          Permission was denied. You can change this in your browser's site settings.
        </div>
      )}

      {permissionStatus === "denied" && (
        <a
          href="https://support.google.com/chrome/answer/3220216"
          target="_blank"
          rel="noreferrer noopener"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent-sky hover:underline"
        >
          How to re-enable notifications
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      )}

      {permissionStatus === "granted" && (
        <div className="mt-4 space-y-3 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-foreground">All alerts</p>
              <p className="text-[11px] text-foreground-muted">
                Master switch — turning this off pauses every category below.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={alertsEnabled}
              aria-label="Toggle all notification alerts"
              onClick={() => toggleAlerts(!alertsEnabled)}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                alertsEnabled ? "bg-accent-sky" : "bg-foreground/15"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  alertsEnabled ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {(Object.keys(CATEGORY_LABELS) as NotificationCategory[]).map((category) => (
            <div key={category} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-foreground">{CATEGORY_LABELS[category]}</p>
                <p className="text-[11px] text-foreground-muted">{CATEGORY_DESCRIPTIONS[category]}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={categoryPreferences[category] && alertsEnabled}
                aria-label={`Toggle ${CATEGORY_LABELS[category]}`}
                disabled={!alertsEnabled}
                onClick={() => toggleCategory(category, !categoryPreferences[category])}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
                  categoryPreferences[category] && alertsEnabled
                    ? "bg-accent-sky"
                    : "bg-foreground/15"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    categoryPreferences[category] && alertsEnabled
                      ? "translate-x-4"
                      : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          ))}

          <p className="flex items-center gap-1.5 pt-1 text-[11px] text-foreground-muted">
            <Bell size={11} aria-hidden="true" />
            Revoking browser-level permission fully stops delivery even if these are on.
          </p>
        </div>
      )}
    </div>
  );
}
