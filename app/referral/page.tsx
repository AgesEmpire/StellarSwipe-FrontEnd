"use client";

import React, { useMemo, useState } from "react";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";

// ---------------------------------------------------------------------------
// Milestone definitions (#350)
// ---------------------------------------------------------------------------
export interface ReferralMilestone {
  threshold: number;
  reward: string;
  label: string;
}

export const REFERRAL_MILESTONES: ReferralMilestone[] = [
  { threshold: 5, reward: "$10 credit", label: "Starter" },
  { threshold: 10, reward: "$25 credit + badge", label: "Advocate" },
  { threshold: 25, reward: "$75 credit + premium month", label: "Champion" },
  { threshold: 50, reward: "$200 credit + VIP access", label: "Legend" },
];

/** Returns the next milestone the user hasn't yet reached, or null if all done. */
export function getNextMilestone(
  count: number
): ReferralMilestone | null {
  return REFERRAL_MILESTONES.find((m) => count < m.threshold) ?? null;
}

/** Returns the last milestone the user has reached, or null if none. */
export function getReachedMilestone(
  count: number
): ReferralMilestone | null {
  const reached = REFERRAL_MILESTONES.filter((m) => count >= m.threshold);
  return reached.length > 0 ? reached[reached.length - 1] : null;
}

/**
 * Calculates progress (0–100) toward the next milestone.
 * The progress is relative to the span between the previous milestone
 * threshold and the next one.
 */
export function calcMilestoneProgress(count: number): number {
  const next = getNextMilestone(count);
  if (!next) return 100; // all milestones completed

  const nextIdx = REFERRAL_MILESTONES.indexOf(next);
  const prevThreshold =
    nextIdx === 0 ? 0 : REFERRAL_MILESTONES[nextIdx - 1].threshold;
  const span = next.threshold - prevThreshold;
  const earned = count - prevThreshold;
  return Math.min(100, Math.max(0, (earned / span) * 100));
}

// ---------------------------------------------------------------------------
// UTM link helpers
// ---------------------------------------------------------------------------
const BASE_REFERRAL_URL = "https://app.example.com/referral/ABC123";

const UTM_CHANNELS = [
  { key: "twitter", label: "Twitter", source: "twitter", medium: "social" },
  { key: "telegram", label: "Telegram", source: "telegram", medium: "social" },
  {
    key: "whatsapp",
    label: "WhatsApp",
    source: "whatsapp",
    medium: "messaging",
  },
  { key: "email", label: "Email", source: "email", medium: "email" },
] as const;

type ChannelKey = (typeof UTM_CHANNELS)[number]["key"];

function buildReferralLink(baseUrl: string, channel: ChannelKey): string {
  const ch = UTM_CHANNELS.find((c) => c.key === channel);
  if (!ch) return baseUrl;
  const params = new URLSearchParams({
    utm_source: ch.source,
    utm_medium: ch.medium,
    utm_campaign: "referral",
    utm_content: channel,
  });
  return `${baseUrl}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Milestone Progress Bar component
// ---------------------------------------------------------------------------
function MilestoneProgressBar({ referralCount }: { referralCount: number }) {
  const nextMilestone = getNextMilestone(referralCount);
  const reachedMilestone = getReachedMilestone(referralCount);
  const progress = calcMilestoneProgress(referralCount);
  const allComplete = !nextMilestone;

  // Celebratory state: freshly hit a milestone exactly
  const isNewlyReached = REFERRAL_MILESTONES.some(
    (m) => m.threshold === referralCount
  );

  return (
    <div
      className="bg-white/5 p-4 rounded mb-4"
      role="region"
      aria-label="Referral milestone progress"
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-sm">Milestone Progress</h2>
        {reachedMilestone && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">
            {reachedMilestone.label} reached
          </span>
        )}
      </div>

      {/* Celebratory banner */}
      {isNewlyReached && reachedMilestone && (
        <div
          role="status"
          aria-live="polite"
          className="mb-3 flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/40 px-3 py-2"
        >
          <span className="text-lg" aria-hidden="true">🎉</span>
          <div>
            <p className="text-sm font-semibold text-purple-200">
              Milestone reached: {reachedMilestone.label}!
            </p>
            <p className="text-xs text-gray-300">
              You&apos;ve unlocked <strong>{reachedMilestone.reward}</strong>.
            </p>
          </div>
        </div>
      )}

      {allComplete ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/40 px-3 py-2"
        >
          <span className="text-lg" aria-hidden="true">🏆</span>
          <p className="text-sm font-semibold text-yellow-200">
            All milestones completed — you&apos;re a Legend!
          </p>
        </div>
      ) : (
        <>
          {/* Progress label */}
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>
              {referralCount} / {nextMilestone.threshold} referrals
            </span>
            <span>
              Next:{" "}
              <span className="text-purple-300 font-medium">
                {nextMilestone.reward}
              </span>{" "}
              at {nextMilestone.threshold}
            </span>
          </div>

          {/* Progress bar */}
          <div
            className="relative h-3 w-full overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuenow={referralCount}
            aria-valuemin={0}
            aria-valuemax={nextMilestone.threshold}
            aria-label={`${referralCount} of ${nextMilestone.threshold} referrals to next milestone`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Milestone tick marks */}
          <div className="relative mt-1 flex justify-between text-[10px] text-gray-500">
            {REFERRAL_MILESTONES.map((m) => {
              const reachedThis = referralCount >= m.threshold;
              return (
                <span
                  key={m.threshold}
                  className={
                    reachedThis ? "text-purple-400 font-medium" : undefined
                  }
                  title={`${m.label}: ${m.reward}`}
                >
                  {m.threshold}
                </span>
              );
            })}
          </div>
        </>
      )}

      {/* All milestones list */}
      <ul className="mt-3 space-y-1.5" aria-label="All milestones">
        {REFERRAL_MILESTONES.map((m) => {
          const done = referralCount >= m.threshold;
          return (
            <li
              key={m.threshold}
              className="flex items-center justify-between text-xs"
            >
              <span className="flex items-center gap-1.5">
                <span
                  className={
                    done ? "text-purple-400" : "text-gray-600"
                  }
                  aria-hidden="true"
                >
                  {done ? "✓" : "○"}
                </span>
                <span className={done ? "text-gray-300" : "text-gray-500"}>
                  {m.threshold} referrals — {m.label}
                </span>
              </span>
              <span
                className={
                  done
                    ? "text-purple-300 font-medium"
                    : "text-gray-500"
                }
              >
                {m.reward}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
function ReferralPageInner() {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<ChannelKey>("twitter");

  // Demo referral data (in a real app this would come from an API)
  const referrals = [
    {
      id: "r1",
      email: "alice@example.com",
      status: "verified",
      earned: 10,
      channel: "twitter",
    },
    {
      id: "r2",
      email: "bob@example.com",
      status: "pending",
      earned: 0,
      channel: "telegram",
    },
  ];

  // Only count verified referrals toward milestones
  const verifiedCount = useMemo(
    () => referrals.filter((r) => r.status === "verified").length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [referrals.length]
  );

  const generatedLink = buildReferralLink(BASE_REFERRAL_URL, selectedChannel);

  const copy = async () => {
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const channelCounts = referrals.reduce<Record<string, number>>((acc, r) => {
    acc[r.channel] = (acc[r.channel] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Referral Program</h1>

      {/* ── Milestone progress bar (#350) ─────────────────────────────────── */}
      <MilestoneProgressBar referralCount={verifiedCount} />

      {/* UTM link generator */}
      <div className="bg-white/5 p-4 rounded mb-4">
        <p className="text-sm text-gray-400 mb-2">
          Generate referral link with UTM tracking
        </p>

        {/* Channel selector */}
        <div
          className="flex flex-wrap gap-2 mb-3"
          role="group"
          aria-label="Select channel"
        >
          {UTM_CHANNELS.map((ch) => (
            <button
              key={ch.key}
              onClick={() => setSelectedChannel(ch.key)}
              aria-pressed={selectedChannel === ch.key}
              data-testid={`channel-${ch.key}`}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                selectedChannel === ch.key
                  ? "bg-purple-500 text-white"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              {ch.label}
            </button>
          ))}
        </div>

        {/* Generated link display + copy */}
        <div className="flex gap-2 items-center">
          <input
            readOnly
            value={generatedLink}
            className="flex-1 bg-black/20 px-3 py-2 rounded text-sm font-mono"
            data-testid="utm-link-input"
            aria-label="Generated referral link with UTM parameters"
          />
          <button
            onClick={copy}
            className="px-3 py-2 bg-purple-500 hover:bg-purple-600 rounded text-sm transition-colors"
            data-testid="copy-link-btn"
            aria-label="Copy referral link"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Referral list */}
      <div className="bg-white/5 p-4 rounded mb-4">
        <h2 className="font-semibold mb-2">Active Referrals</h2>
        <div className="space-y-2">
          {referrals.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between p-2 bg-black/20 rounded"
            >
              <div>
                <div className="text-sm">{r.email}</div>
                <div className="text-xs text-gray-400">
                  Status: {r.status} · Channel: {r.channel}
                </div>
              </div>
              <div className="text-sm">Earned: ${r.earned}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Channel performance breakdown */}
      <div className="bg-white/5 p-4 rounded mb-4">
        <h2 className="font-semibold mb-2">Performance by Channel</h2>
        <div className="space-y-1">
          {UTM_CHANNELS.map((ch) => (
            <div
              key={ch.key}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-gray-300">{ch.label}</span>
              <span
                className="text-gray-400"
                data-testid={`channel-count-${ch.key}`}
              >
                {t("referral.count", { count: channelCounts[ch.key] ?? 0 })}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-400">
        By participating you agree to the{" "}
        <a href="#" className="text-purple-400">
          Referral Terms &amp; Conditions
        </a>
        .
      </div>
    </div>
  );
}

export default function ReferralPage() {
  return (
    <RouteErrorBoundary featureName="Referrals">
      <ReferralPageInner />
    </RouteErrorBoundary>
  );
}
