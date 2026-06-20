import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";
import { PageTransitionPlaceholder } from "@/components/PageTransitionPlaceholder";
import { TradeStatusBanner } from "@/components/TradeStatusBanner";
import { DevPerfOverlay } from "@/components/DevPerfOverlay";
import { ScrollRestoration } from "@/components/ScrollRestoration";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const metadata: Metadata = {
  title: "StellarSwipe",
  description: "Stellar-powered swipe app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply persisted theme before first paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var item=localStorage.getItem('stellar-theme');var theme=item?JSON.parse(item).state?.theme:null; if(!theme){theme=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';} document.documentElement.classList.remove('light','dark'); document.documentElement.classList.add(theme);}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <Providers>
          <ScrollRestoration />
          <Navbar />
          <PageTransitionPlaceholder />
          {children}
          <TradeStatusBanner />
          <DevPerfOverlay />
        </Providers>
      </body>
    </html>
  );
}
