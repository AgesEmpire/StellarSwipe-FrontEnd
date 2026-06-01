import { useQuery, useMutation } from "@tanstack/react-query";
import { useReferralStore, Referral, ReferralEarning, REFERRAL_TIERS } from "@/store/useReferralStore";
import { useWalletStore } from "@/store/useWalletStore";
import { toast } from "sonner";

// ── Mock data generators ──────────────────────────────────────────────────────

function generateReferralCode(publicKey: string | null): string {
  if (!publicKey) return "STELLAR-DEMO";
  return `SS-${publicKey.slice(0, 6).toUpperCase()}`;
}

const MOCK_REFERRALS: Referral[] = [
  { id: "r1", username: "CryptoAce",    address: "GA7VIQ...XVFUA", status: "trading",  joinedAt: "2026-04-10T10:00:00Z", lastActiveAt: "2026-05-30T08:00:00Z", earnedReward: 25 },
  { id: "r2", username: "StarTrader",   address: "GAJQHJ...AB",    status: "verified", joinedAt: "2026-04-18T14:00:00Z", lastActiveAt: "2026-05-28T12:00:00Z", earnedReward: 12 },
  { id: "r3", username: "LunarHodler",  address: "GBVDJK...BV",    status: "pending",  joinedAt: "2026-05-01T09:00:00Z", earnedReward: 0 },
  { id: "r4", username: "XLMWhale",     address: "GCVDJK...BV",    status: "trading",  joinedAt: "2026-03-22T16:00:00Z", lastActiveAt: "2026-06-01T07:00:00Z", earnedReward: 25 },
  { id: "r5", username: "StellarFan",   address: "GDVDJK...BV",    status: "inactive", joinedAt: "2026-02-14T11:00:00Z", lastActiveAt: "2026-03-01T10:00:00Z", earnedReward: 5 },
  { id: "r6", username: "BlockchainBob",address: "GEVDJK...BV",    status: "invited",  joinedAt: "2026-05-28T20:00:00Z", earnedReward: 0 },
  { id: "r7", username: "DeFiDave",     address: "GFVDJK...BV",    status: "trading",  joinedAt: "2026-03-05T13:00:00Z", lastActiveAt: "2026-05-31T15:00:00Z", earnedReward: 25 },
  { id: "r8", username: "AstroAlice",   address: "GGVDJK...BV",    status: "verified", joinedAt: "2026-04-25T08:00:00Z", lastActiveAt: "2026-05-20T09:00:00Z", earnedReward: 12 },
];

const MOCK_EARNINGS: ReferralEarning[] = [
  { id: "e1", referralId: "r1", referralName: "CryptoAce",    amount: 25, date: "2026-04-10T10:00:00Z", type: "trade",   status: "paid" },
  { id: "e2", referralId: "r2", referralName: "StarTrader",   amount: 12, date: "2026-04-18T14:00:00Z", type: "signup",  status: "paid" },
  { id: "e3", referralId: "r4", referralName: "XLMWhale",     amount: 25, date: "2026-03-22T16:00:00Z", type: "trade",   status: "paid" },
  { id: "e4", referralId: "r5", referralName: "StellarFan",   amount: 5,  date: "2026-02-14T11:00:00Z", type: "signup",  status: "paid" },
  { id: "e5", referralId: "r7", referralName: "DeFiDave",     amount: 25, date: "2026-03-05T13:00:00Z", type: "trade",   status: "paid" },
  { id: "e6", referralId: "r8", referralName: "AstroAlice",   amount: 12, date: "2026-04-25T08:00:00Z", type: "signup",  status: "paid" },
  { id: "e7", referralId: "r3", referralName: "LunarHodler",  amount: 8,  date: "2026-05-01T09:00:00Z", type: "signup",  status: "pending" },
  { id: "e8", referralId: "r6", referralName: "BlockchainBob",amount: 5,  date: "2026-05-28T20:00:00Z", type: "signup",  status: "pending" },
  { id: "e9", referralId: "r1", referralName: "CryptoAce",    amount: 15, date: "2026-05-15T10:00:00Z", type: "tier_bonus", status: "paid" },
];

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useReferral() {
  const { publicKey } = useWalletStore();
  const store = useReferralStore();

  const { data: referrals, isLoading: referralsLoading } = useQuery({
    queryKey: ["referrals", publicKey],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 600));
      return MOCK_REFERRALS;
    },
    staleTime: 60_000,
    onSuccess: (data: Referral[]) => {
      store.setReferrals(data);
      const code = generateReferralCode(publicKey);
      store.setReferralCode(code);
    },
  } as any);

  const { data: earnings, isLoading: earningsLoading } = useQuery({
    queryKey: ["referral-earnings", publicKey],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400));
      return MOCK_EARNINGS;
    },
    staleTime: 60_000,
    onSuccess: (data: ReferralEarning[]) => {
      store.setEarnings(data);
    },
  } as any);

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      await new Promise((r) => setTimeout(r, 1500));
      return { success: true };
    },
    onMutate: () => store.setWithdrawing(true),
    onSuccess: () => {
      toast.success("Withdrawal initiated", {
        description: "Your earnings will arrive within 24 hours.",
      });
    },
    onError: () => {
      toast.error("Withdrawal failed", { description: "Please try again later." });
    },
    onSettled: () => store.setWithdrawing(false),
  });

  const activeReferrals = (referrals ?? store.referrals).filter(
    (r) => r.status === "trading" || r.status === "verified"
  );
  const totalReferrals = (referrals ?? store.referrals).length;

  // Determine current tier
  const currentTier = [...REFERRAL_TIERS]
    .reverse()
    .find((t) => totalReferrals >= t.minReferrals) ?? REFERRAL_TIERS[0];

  const nextTier = REFERRAL_TIERS.find((t) => t.minReferrals > totalReferrals) ?? null;

  const referralLink = `https://stellarswipe.app/join?ref=${store.referralCode ?? generateReferralCode(publicKey)}`;

  return {
    referralCode: store.referralCode ?? generateReferralCode(publicKey),
    referralLink,
    referrals: referrals ?? store.referrals,
    earnings: earnings ?? store.earnings,
    totalEarned: store.totalEarned,
    pendingPayout: store.pendingPayout,
    activeReferrals,
    totalReferrals,
    currentTier,
    nextTier,
    isLoading: referralsLoading || earningsLoading,
    isWithdrawing: store.isWithdrawing,
    withdraw: withdrawMutation.mutate,
  };
}
