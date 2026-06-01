import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ReferralStatus = "invited" | "pending" | "verified" | "trading" | "inactive";

export interface Referral {
  id: string;
  username: string;
  address: string;
  status: ReferralStatus;
  joinedAt: string;
  lastActiveAt?: string;
  earnedReward: number;
}

export interface ReferralEarning {
  id: string;
  referralId: string;
  referralName: string;
  amount: number;
  date: string;
  type: "signup" | "trade" | "tier_bonus";
  status: "paid" | "pending";
}

export interface ReferralTier {
  name: string;
  minReferrals: number;
  rewardPerReferral: number;
  bonusPercent: number;
  color: string;
}

export interface ReferralState {
  referralCode: string | null;
  referrals: Referral[];
  earnings: ReferralEarning[];
  totalEarned: number;
  pendingPayout: number;
  isWithdrawing: boolean;
  setReferralCode: (code: string) => void;
  setReferrals: (referrals: Referral[]) => void;
  setEarnings: (earnings: ReferralEarning[]) => void;
  setWithdrawing: (v: boolean) => void;
}

export const REFERRAL_TIERS: ReferralTier[] = [
  { name: "Starter",   minReferrals: 0,  rewardPerReferral: 5,   bonusPercent: 0,  color: "#6b7280" },
  { name: "Silver",    minReferrals: 5,  rewardPerReferral: 8,   bonusPercent: 5,  color: "#94a3b8" },
  { name: "Gold",      minReferrals: 15, rewardPerReferral: 12,  bonusPercent: 10, color: "#f59e0b" },
  { name: "Platinum",  minReferrals: 30, rewardPerReferral: 18,  bonusPercent: 20, color: "#8b5cf6" },
  { name: "Diamond",   minReferrals: 60, rewardPerReferral: 25,  bonusPercent: 35, color: "#06b6d4" },
];

export const useReferralStore = create<ReferralState>()(
  persist(
    (set) => ({
      referralCode: null,
      referrals: [],
      earnings: [],
      totalEarned: 0,
      pendingPayout: 0,
      isWithdrawing: false,
      setReferralCode: (code) => set({ referralCode: code }),
      setReferrals: (referrals) => set({ referrals }),
      setEarnings: (earnings) => {
        const totalEarned = earnings
          .filter((e) => e.status === "paid")
          .reduce((sum, e) => sum + e.amount, 0);
        const pendingPayout = earnings
          .filter((e) => e.status === "pending")
          .reduce((sum, e) => sum + e.amount, 0);
        set({ earnings, totalEarned, pendingPayout });
      },
      setWithdrawing: (v) => set({ isWithdrawing: v }),
    }),
    { name: "referral-store" }
  )
);
