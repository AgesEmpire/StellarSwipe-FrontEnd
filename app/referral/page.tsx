"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  Twitter,
  Send,
  Mail,
  Share2,
  Users,
  DollarSign,
  Clock,
  TrendingUp,
  ArrowDownToLine,
  ExternalLink,
  ChevronRight,
  Gift,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useReferral } from "@/hooks/useReferral";
import { REFERRAL_TIERS, type ReferralStatus } from "@/store/useReferralStore";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ReferralStatus, { label: string; className: string }> = {
  invited:  { label: "Invited",  className: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  pending:  { label: "Pending",  className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  verified: { label: "Verified", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  trading:  { label: "Trading",  className: "bg-green-500/20 text-green-400 border-green-500/30" },
  inactive: { label: "Inactive", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Earnings chart (simple SVG bar chart) ─────────────────────────────────────

function EarningsChart({ earnings }: { earnings: { date: string; amount: number; status: string }[] }) {
  const paid = earnings.filter((e) => e.status === "paid");
  if (paid.length === 0) return <p className="text-sm text-foreground-muted text-center py-8">No earnings yet</p>;

  // Group by month
  const byMonth = new Map<string, number>();
  for (const e of paid) {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + e.amount);
  }
  const entries = Array.from(byMonth.entries()).map(([k, v]) => {
    const [year, month] = k.split("-").map(Number);
    return { label: `${MONTH_NAMES[month]} ${year}`, value: v };
  });
  const max = Math.max(...entries.map((e) => e.value), 1);

  return (
    <div className="flex items-end gap-2 h-32 pt-2">
      {entries.map((e) => (
        <div key={e.label} className="flex flex-col items-center gap-1 flex-1 min-w-0">
          <span className="text-[10px] text-foreground-muted">${e.value}</span>
          <div
            className="w-full rounded-t bg-[hsl(var(--accent-primary)/0.7)] hover:bg-[hsl(var(--accent-primary))] transition-colors"
            style={{ height: `${(e.value / max) * 80}px` }}
            title={`${e.label}: $${e.value}`}
          />
          <span className="text-[10px] text-foreground-subtle truncate w-full text-center">{e.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Status breakdown ──────────────────────────────────────────────────────────

function StatusBreakdown({ referrals }: { referrals: { status: ReferralStatus }[] }) {
  const counts = referrals.reduce<Record<ReferralStatus, number>>(
    (acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; },
    { invited: 0, pending: 0, verified: 0, trading: 0, inactive: 0 }
  );
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {(Object.entries(counts) as [ReferralStatus, number][]).map(([status, count]) => (
        <div key={status} className={cn("rounded-lg border px-3 py-2 text-center", STATUS_CONFIG[status].className)}>
          <p className="text-lg font-bold">{count}</p>
          <p className="text-xs capitalize">{STATUS_CONFIG[status].label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Tier progress ─────────────────────────────────────────────────────────────

function TierProgress({ totalReferrals, currentTier, nextTier }: {
  totalReferrals: number;
  currentTier: typeof REFERRAL_TIERS[0];
  nextTier: typeof REFERRAL_TIERS[0] | null;
}) {
  const progress = nextTier
    ? ((totalReferrals - currentTier.minReferrals) / (nextTier.minReferrals - currentTier.minReferrals)) * 100
    : 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star size={16} style={{ color: currentTier.color }} />
          <span className="font-semibold" style={{ color: currentTier.color }}>{currentTier.name}</span>
          <span className="text-xs text-foreground-muted">tier</span>
        </div>
        {nextTier && (
          <span className="text-xs text-foreground-muted">
            {nextTier.minReferrals - totalReferrals} more to {nextTier.name}
          </span>
        )}
      </div>
      <div className="h-2 rounded-full bg-surface-high overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: currentTier.color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <div className="grid grid-cols-5 gap-1">
        {REFERRAL_TIERS.map((tier) => (
          <div
            key={tier.name}
            className={cn(
              "rounded p-2 text-center border transition-all",
              totalReferrals >= tier.minReferrals
                ? "border-transparent"
                : "border-border opacity-50"
            )}
            style={totalReferrals >= tier.minReferrals ? { backgroundColor: `${tier.color}20`, borderColor: `${tier.color}40` } : {}}
          >
            <p className="text-[10px] font-semibold" style={{ color: tier.color }}>{tier.name}</p>
            <p className="text-[10px] text-foreground-muted">${tier.rewardPerReferral}/ref</p>
            <p className="text-[10px] text-foreground-subtle">{tier.minReferrals}+ refs</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReferralPage() {
  const {
    referralCode,
    referralLink,
    referrals,
    earnings,
    totalEarned,
    pendingPayout,
    activeReferrals,
    totalReferrals,
    currentTier,
    nextTier,
    isLoading,
    isWithdrawing,
    withdraw,
  } = useReferral();

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"referrals" | "earnings">("referrals");

  function copyLink() {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      toast.success("Referral link copied!", { description: "Share it to start earning." });
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareTwitter() {
    const text = encodeURIComponent(`Join me on StellarSwipe — the best signal trading platform on Stellar! Use my referral link to get started: ${referralLink}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank", "noopener,noreferrer");
  }

  function shareTelegram() {
    const text = encodeURIComponent(`Join StellarSwipe with my referral link: ${referralLink}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${text}`, "_blank", "noopener,noreferrer");
  }

  function shareWhatsApp() {
    const text = encodeURIComponent(`Join StellarSwipe with my referral link: ${referralLink}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  function shareEmail() {
    const subject = encodeURIComponent("Join me on StellarSwipe");
    const body = encodeURIComponent(`Hey!\n\nI've been using StellarSwipe for signal trading on the Stellar network and it's been great. Use my referral link to sign up:\n\n${referralLink}\n\nSee you there!`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-[hsl(var(--background))] pb-16">
        <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Gift size={24} className="text-[hsl(var(--accent-primary))]" />
              Referral Dashboard
            </h1>
            <p className="text-sm text-foreground-muted mt-1">
              Invite friends and earn rewards for every active trader you bring in.
            </p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Earned",    value: `$${totalEarned.toFixed(2)}`,    icon: DollarSign, color: "text-[hsl(var(--accent-success))]" },
              { label: "Pending Payout",  value: `$${pendingPayout.toFixed(2)}`,  icon: Clock,      color: "text-[hsl(var(--accent-warning))]" },
              { label: "Active Referrals",value: String(activeReferrals.length),  icon: Users,      color: "text-[hsl(var(--accent-primary))]" },
              { label: "Total Referrals", value: String(totalReferrals),           icon: TrendingUp, color: "text-[hsl(var(--accent-sky))]" },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={13} className={cn("shrink-0", color)} aria-hidden="true" />
                    <span className="text-[11px] text-foreground-muted">{label}</span>
                  </div>
                  <p className={cn("text-xl font-bold", color)}>{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Referral link */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-foreground">Your Referral Link</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-high px-3 py-2">
                <span className="flex-1 text-sm font-mono text-foreground-muted truncate">{referralLink}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyLink}
                  className="shrink-0 gap-1.5"
                  aria-label="Copy referral link"
                >
                  {copied ? <Check size={14} className="text-[hsl(var(--accent-success))]" /> : <Copy size={14} />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>

              <div>
                <p className="text-xs text-foreground-muted mb-2">Share via</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={shareTwitter} className="gap-1.5" aria-label="Share on Twitter">
                    <Twitter size={14} /> Twitter
                  </Button>
                  <Button size="sm" variant="outline" onClick={shareTelegram} className="gap-1.5" aria-label="Share on Telegram">
                    <Send size={14} /> Telegram
                  </Button>
                  <Button size="sm" variant="outline" onClick={shareWhatsApp} className="gap-1.5" aria-label="Share on WhatsApp">
                    <Share2 size={14} /> WhatsApp
                  </Button>
                  <Button size="sm" variant="outline" onClick={shareEmail} className="gap-1.5" aria-label="Share via Email">
                    <Mail size={14} /> Email
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-foreground-muted">
                <span>Referral code:</span>
                <code className="rounded bg-surface-high px-2 py-0.5 font-mono text-foreground">{referralCode}</code>
              </div>
            </CardContent>
          </Card>

          {/* Tier system */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-foreground">Reward Tiers</h2>
            </CardHeader>
            <CardContent>
              <TierProgress totalReferrals={totalReferrals} currentTier={currentTier} nextTier={nextTier} />
            </CardContent>
          </Card>

          {/* Status breakdown */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-foreground">Referral Status Breakdown</h2>
            </CardHeader>
            <CardContent>
              <StatusBreakdown referrals={referrals} />
            </CardContent>
          </Card>

          {/* Earnings chart */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-foreground">Historical Earnings</h2>
            </CardHeader>
            <CardContent>
              <EarningsChart earnings={earnings} />
            </CardContent>
          </Card>

          {/* Tabs: Referrals / Earnings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-1 rounded-lg bg-surface-high p-1 w-fit">
                {(["referrals", "earnings"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "rounded-md px-4 py-1.5 text-sm font-medium transition-colors capitalize",
                      activeTab === tab
                        ? "bg-[hsl(var(--accent-primary))] text-white"
                        : "text-foreground-muted hover:text-foreground"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 rounded-lg bg-surface-high animate-pulse" />
                  ))}
                </div>
              ) : activeTab === "referrals" ? (
                <div className="space-y-2">
                  {referrals.length === 0 ? (
                    <p className="text-center text-foreground-muted py-8 text-sm">No referrals yet. Share your link to get started!</p>
                  ) : (
                    referrals.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-high px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-[hsl(var(--accent-primary)/0.2)] flex items-center justify-center text-xs font-bold text-[hsl(var(--accent-primary))]">
                            {r.username[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{r.username}</p>
                            <p className="text-xs text-foreground-muted font-mono">{r.address}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right hidden sm:block">
                            <p className="text-xs text-foreground-muted">Joined {formatDate(r.joinedAt)}</p>
                            {r.earnedReward > 0 && (
                              <p className="text-xs text-[hsl(var(--accent-success))]">+${r.earnedReward} earned</p>
                            )}
                          </div>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", STATUS_CONFIG[r.status].className)}>
                            {STATUS_CONFIG[r.status].label}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {earnings.length === 0 ? (
                    <p className="text-center text-foreground-muted py-8 text-sm">No earnings yet.</p>
                  ) : (
                    earnings.map((e) => (
                      <div key={e.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-high px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{e.referralName}</p>
                          <p className="text-xs text-foreground-muted capitalize">{e.type.replace("_", " ")} · {formatDate(e.date)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-sm font-semibold",
                            e.status === "paid" ? "text-[hsl(var(--accent-success))]" : "text-[hsl(var(--accent-warning))]"
                          )}>
                            +${e.amount}
                          </span>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full border",
                            e.status === "paid"
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          )}>
                            {e.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Withdraw + Terms */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Available to withdraw</p>
              <p className="text-2xl font-bold text-[hsl(var(--accent-success))]">${totalEarned.toFixed(2)}</p>
              {pendingPayout > 0 && (
                <p className="text-xs text-foreground-muted">${pendingPayout.toFixed(2)} pending verification</p>
              )}
            </div>
            <Button
              onClick={() => withdraw()}
              disabled={isWithdrawing || totalEarned === 0}
              className="gap-2 shrink-0"
              aria-label="Withdraw earnings"
            >
              <ArrowDownToLine size={16} />
              {isWithdrawing ? "Processing…" : "Withdraw Earnings"}
            </Button>
          </div>

          <div className="text-center">
            <a
              href="#referral-terms"
              className="inline-flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground transition-colors"
              aria-label="View referral terms and conditions"
            >
              <ExternalLink size={12} />
              Referral Terms &amp; Conditions
            </a>
          </div>

          {/* Terms anchor */}
          <div id="referral-terms" className="rounded-lg border border-border bg-surface p-4 text-xs text-foreground-muted space-y-2">
            <h3 className="font-semibold text-foreground text-sm">Referral Terms &amp; Conditions</h3>
            <p>Rewards are paid in XLM to your connected wallet. Referrals must complete KYC verification and execute at least one trade to qualify. Rewards are subject to a 7-day holding period before withdrawal. StellarSwipe reserves the right to modify or terminate the referral program at any time. Self-referrals are prohibited and will result in account suspension.</p>
            <p>Tier bonuses are calculated based on the total number of active referrals at the time of payout. Inactive referrals (no activity for 90 days) do not count toward tier thresholds.</p>
          </div>

        </div>
      </main>
    </PageTransition>
  );
}
