/**
 * Referral milestone thresholds and progress helpers (issue #350).
 */

export interface ReferralMilestone {
  /** Number of successful referrals required */
  threshold: number;
  /** Human-readable reward description */
  reward: string;
  /** Optional bonus amount in USD for display */
  bonusUsd: number;
}

export const REFERRAL_MILESTONES: readonly ReferralMilestone[] = [
  { threshold: 5, reward: "$25 trading credit", bonusUsd: 25 },
  { threshold: 10, reward: "$75 trading credit", bonusUsd: 75 },
  { threshold: 25, reward: "$250 trading credit + badge", bonusUsd: 250 },
] as const;

export interface MilestoneProgress {
  /** Total successful referrals counted */
  referralCount: number;
  /** Highest milestone fully reached, or null if none */
  currentMilestone: ReferralMilestone | null;
  /** Next milestone to aim for, or null if all complete */
  nextMilestone: ReferralMilestone | null;
  /** Progress toward next milestone in [0, 1]; 1 when all complete */
  progressRatio: number;
  /** Referrals still needed for the next milestone */
  remaining: number;
  /** True when referralCount exactly equals a milestone threshold */
  justReached: boolean;
  /** All milestones that have been reached */
  reachedMilestones: ReferralMilestone[];
}

/**
 * Compute progress relative to the configured milestones.
 * Only counts toward milestones; does not invent new thresholds.
 */
export function computeMilestoneProgress(
  referralCount: number,
  milestones: readonly ReferralMilestone[] = REFERRAL_MILESTONES
): MilestoneProgress {
  const count = Math.max(0, Math.floor(referralCount));
  const sorted = [...milestones].sort((a, b) => a.threshold - b.threshold);

  const reachedMilestones = sorted.filter((m) => count >= m.threshold);
  const currentMilestone =
    reachedMilestones.length > 0
      ? reachedMilestones[reachedMilestones.length - 1]
      : null;
  const nextMilestone =
    sorted.find((m) => count < m.threshold) ?? null;

  const justReached = sorted.some((m) => m.threshold === count);

  if (!nextMilestone) {
    return {
      referralCount: count,
      currentMilestone,
      nextMilestone: null,
      progressRatio: 1,
      remaining: 0,
      justReached,
      reachedMilestones,
    };
  }

  const prevThreshold = currentMilestone?.threshold ?? 0;
  const span = nextMilestone.threshold - prevThreshold;
  const progressed = count - prevThreshold;
  const progressRatio = span > 0 ? Math.min(1, progressed / span) : 1;

  return {
    referralCount: count,
    currentMilestone,
    nextMilestone,
    progressRatio,
    remaining: Math.max(0, nextMilestone.threshold - count),
    justReached,
    reachedMilestones,
  };
}
