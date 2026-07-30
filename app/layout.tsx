import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";
import { PageTransitionPlaceholder } from "@/components/PageTransitionPlaceholder";
import { TradeStatusBanner } from "@/components/TradeStatusBanner";
import { DevPerfOverlay } from "@/components/DevPerfOverlay";
import { AnalyticsDebugConsole } from "@/components/AnalyticsDebugConsole";
import { ScrollRestoration } from "@/components/ScrollRestoration";
import { WebVitalsReporting } from "@/components/WebVitalsReporting";
import { ComparisonTray } from "@/components/ComparisonTray";
import { NotificationPermissionPrompt } from "@/components/NotificationPermissionPrompt";
import { GuidedTourSpotlight } from "@/components/GuidedTourSpotlight";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
});

export const metadata: Metadata = {
  title: "StellarSwipe",
  description: "Stellar-powered swipe app",
  openGraph: {
    title: "StellarSwipe",
    description: "Stellar-powered swipe app — discover top signal providers, trade tokens, and track performance on the Stellar network.",
    url: "/",
    siteName: "StellarSwipe",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "StellarSwipe",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "StellarSwipe",
    description: "Stellar-powered swipe app — discover top signal providers, trade tokens, and track performance on the Stellar network.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={inter.variable}
    >
      <head>
        {/*
         * Blocking inline script — runs synchronously before any paint.
         * Reads the persisted Zustand theme ("stellar-theme" → state.theme),
         * falls back to the OS prefers-color-scheme, then applies the correct
         * .dark / .light class to <html> before any CSS or React hydration.
         * suppressHydrationWarning on <html> lets React reconcile safely.
         */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('stellar-theme');var t=s?JSON.parse(s).state?.theme:null;if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.classList.remove('light','dark');document.documentElement.classList.add(t);}catch(e){document.documentElement.classList.add('dark');}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <Providers>
          {/* Skip link — visually hidden until focused; lets keyboard users bypass nav */}
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <ScrollRestoration />
          <WebVitalsReporting />
          <Navbar />
          <PageTransitionPlaceholder />
          {/* id="main-content" is the skip-link target; pages provide the <main> landmark */}
          <div id="main-content" tabIndex={-1} className="outline-none">
            {children}
          </div>
          <TradeStatusBanner />
          <DevPerfOverlay />
          <AnalyticsDebugConsole />
          <ComparisonTray />
          <NotificationPermissionPrompt />
          <GuidedTourSpotlight />
        </Providers>
      </body>
    </html>
  );
}
