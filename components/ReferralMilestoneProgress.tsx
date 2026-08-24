"use client";

import {
  REFERRAL_MILESTONES,
  computeMilestoneProgress,
  type MilestoneProgress,
} from "@/lib/referralMilestones";

export interface ReferralMilestoneProgressProps {
  /** Number of successful / verified referrals */
  referralCount: number;
  className?: string;
}

/**
 * Visual progress toward the next referral reward milestone (issue #350).
 */
export function ReferralMilestoneProgress({
  referralCount,
  className = "",
}: ReferralMilestoneProgressProps) {
  const progress: MilestoneProgress = computeMilestoneProgress(referralCount);
  const pct = Math.round(progress.progressRatio * 100);

  return (
    <div
      className={`bg-white/5 p-4 rounded ${className}`}
      data-testid="referral-milestone-progress"
      aria-label="Referral milestone progress"
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">Reward milestones</h2>
        <span className="text-sm text-gray-400" data-testid="referral-count-label">
          {progress.referralCount} referral
          {progress.referralCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Celebratory banner when a milestone was just hit */}
      {progress.justReached && progress.currentMilestone && (
        <div
          className="mb-3 rounded border border-purple-400/40 bg-purple-500/15 px-3 py-2 text-sm text-purple-200"
          data-testid="milestone-celebration"
          role="status"
        >
          🎉 Milestone reached: {progress.currentMilestone.threshold} referrals —{" "}
          <span className="font-medium">{progress.currentMilestone.reward}</span>
        </div>
      )}

      {/* Milestone checklist */}
      <ul className="mb-3 space-y-1 text-sm">
        {REFERRAL_MILESTONES.map((m) => {
          const reached = progress.referralCount >= m.threshold;
          return (
            <li
              key={m.threshold}
              className={`flex items-center justify-between ${
                reached ? "text-purple-300" : "text-gray-400"
              }`}
              data-testid={`milestone-row-${m.threshold}`}
            >
              <span>
                {reached ? "✓" : "○"} {m.threshold} referrals
              </span>
              <span className="text-xs">{m.reward}</span>
            </li>
          );
        })}
      </ul>

      {/* Progress bar toward next milestone */}
      {progress.nextMilestone ? (
        <>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>
              Next: {progress.nextMilestone.threshold} referrals (
              {progress.nextMilestone.reward})
            </span>
            <span data-testid="milestone-remaining">
              {progress.remaining} to go
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progress toward ${progress.nextMilestone.threshold} referrals`}
            data-testid="milestone-progress-bar"
          >
            <div
              className="h-full rounded-full bg-purple-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      ) : (
        <p
          className="text-sm text-purple-300"
          data-testid="all-milestones-complete"
        >
          All milestones complete — thanks for sharing StellarSwipe!
        </p>
      )}
    </div>
  );
}
