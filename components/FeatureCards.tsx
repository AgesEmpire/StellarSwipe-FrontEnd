"use client";

import { Zap, ShieldCheck, BarChart2, Repeat2 } from "lucide-react";
import { motion } from "framer-motion";
import { fadeUpVariants, useScrollViewport } from "@/hooks/useScrollAnimation";

const features = [
  {
    icon: Zap,
    title: "Instant Signal Execution",
    description:
      "Execute trades directly on the Stellar SDEX the moment a signal fires — no delays, no middlemen.",
    href: "#signals",
  },
  {
    icon: ShieldCheck,
    title: "Non-Custodial & Secure",
    description:
      "Your keys, your funds. StellarSwipe never holds assets — all trades settle on-chain via Freighter.",
    href: "#security",
  },
  {
    icon: BarChart2,
    title: "Verified Provider Rankings",
    description:
      "Follow signal providers ranked by real on-chain performance, win rate, and risk-adjusted returns.",
    href: "#leaderboard",
  },
  {
    icon: Repeat2,
    title: "Automated Copy Trading",
    description:
      "Set position limits and let StellarSwipe mirror top providers automatically within your risk rules.",
    href: "#copy-trading",
  },
];

export function FeatureCards() {
  const scrollProps = useScrollViewport();

  return (
    <section className="w-full py-16 px-6" aria-labelledby="features-heading">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-widest text-sky-400 mb-2">
            Why StellarSwipe
          </p>
          <h2
            id="features-heading"
            className="text-3xl font-bold text-white tracking-tight"
          >
            Everything you need to trade smarter
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                custom={i}
                variants={fadeUpVariants}
                {...scrollProps}
                className="group flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900 p-6
                           transition-all duration-300 hover:border-sky-500/40 hover:shadow-lg hover:shadow-sky-900/20
                           hover:-translate-y-1"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20">
                  <Icon size={22} className="text-sky-400" aria-hidden />
                </div>

                <div className="flex flex-col gap-2 flex-1">
                  <h3 className="text-base font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {feature.href && (
                  <a
                    href={feature.href}
                    className="text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
                  >
                    Learn more →
                  </a>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
