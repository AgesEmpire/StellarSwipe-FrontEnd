"use client";

import React, { useState } from "react";

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

import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";

function ReferralPageInner() {
  const [copied, setCopied] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<ChannelKey>("twitter");
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
                {channelCounts[ch.key] ?? 0} referral
                {(channelCounts[ch.key] ?? 0) !== 1 ? "s" : ""}
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
