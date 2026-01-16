# StellarSwipe-FrontEnd


## Overview

Modern, responsive web app featuring:

- Infinite scrolling signal feed
- Gamified swipe mechanics (Framer Motion drag gestures)
- Freighter wallet integration
- Real-time dashboard & trade execution

Connects to Soroban contracts for on-chain actions.

## Tech Stack

- Next.js 15+ (App Router)
- TypeScript
- Tailwind CSS 4 + shadcn/ui
- Framer Motion (swipes/animations)
- TanStack Query (data fetching)
- @stellar/freighter-api + stellar-sdk
- Zustand (state)
- Vercel deployment

## Quick Start

1. Clone & install:
   ```bash
   git clone https://github.com/EndeMathew/StellarSwipe-frontend.git
   cd StellarSwipe-frontend
   npm install

Set environment variables (.env.local):
    NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
    NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org

Run dev server:
  npm run dev
