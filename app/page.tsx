"use client";

import { useState, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CTABanner } from "@/components/CTABanner";
import { HowItWorks } from "@/components/HowItWorks";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";

export default function Home() {
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  return (
    <PageTransition>
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 sm:gap-8 sm:p-8 bg-gray-950">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative text-center"
        >
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">StellarSwipe</h1>
          <p className="mt-2 text-gray-400">
            Connect your Freighter wallet to get started
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="flex flex-col items-center gap-4"
        >
          <Link href="/app">
            <Button
              size="lg"
              className="focus:ring-2 focus:ring-blue-500"
            >
              Go to Signals
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => setWalletModalOpen(true)}
            size="lg"
            className="focus:ring-2 focus:ring-blue-500"
          >
            Connect Wallet
          </Button>
        </motion.div>

        <HowItWorks />
        <CTABanner />
        <Footer />
      </main>
    </PageTransition>
  );
}
