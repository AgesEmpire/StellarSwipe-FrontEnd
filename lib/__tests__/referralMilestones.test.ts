import {
  REFERRAL_MILESTONES,
  computeMilestoneProgress,
} from "../referralMilestones";

describe("computeMilestoneProgress", () => {
  it("starts at zero with first milestone as next", () => {
    const p = computeMilestoneProgress(0);
    expect(p.currentMilestone).toBeNull();
    expect(p.nextMilestone?.threshold).toBe(5);
    expect(p.progressRatio).toBe(0);
    expect(p.remaining).toBe(5);
    expect(p.justReached).toBe(false);
  });

  it("partial progress toward first milestone", () => {
    const p = computeMilestoneProgress(2);
    expect(p.progressRatio).toBeCloseTo(0.4);
    expect(p.remaining).toBe(3);
    expect(p.currentMilestone).toBeNull();
  });

  it("marks justReached when count equals a threshold", () => {
    const p = computeMilestoneProgress(5);
    expect(p.justReached).toBe(true);
    expect(p.currentMilestone?.threshold).toBe(5);
    expect(p.nextMilestone?.threshold).toBe(10);
    expect(p.progressRatio).toBe(0);
  });

  it("progresses between 5 and 10", () => {
    const p = computeMilestoneProgress(7);
    expect(p.currentMilestone?.threshold).toBe(5);
    expect(p.nextMilestone?.threshold).toBe(10);
    expect(p.progressRatio).toBeCloseTo(0.4);
    expect(p.remaining).toBe(3);
  });

  it("completes all milestones", () => {
    const p = computeMilestoneProgress(30);
    expect(p.nextMilestone).toBeNull();
    expect(p.progressRatio).toBe(1);
    expect(p.remaining).toBe(0);
    expect(p.reachedMilestones).toHaveLength(REFERRAL_MILESTONES.length);
  });

  it("handles negative input as zero", () => {
    const p = computeMilestoneProgress(-3);
    expect(p.referralCount).toBe(0);
    expect(p.progressRatio).toBe(0);
  });
});
