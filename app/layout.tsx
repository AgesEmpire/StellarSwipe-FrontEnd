import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { NavHeader } from "@/components/NavHeader";
import { RouteLoadingIndicator } from "@/components/RouteLoadingIndicator";
import { ScrollRestoration } from "@/components/ScrollRestoration";
import { ErrorBoundaryProvider } from "./error-boundary-wrapper";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <ErrorBoundaryProvider>
          <Providers>
            <ScrollRestoration />
            <NavHeader />
            <RouteLoadingIndicator />
            <main className="pt-14">{children}</main>
          </Providers>
        </ErrorBoundaryProvider>
      </body>
    </html>
  );
}
