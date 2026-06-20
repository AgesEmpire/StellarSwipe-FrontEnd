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

## Reduced Motion

The app respects the system `prefers-reduced-motion` setting. When reduced motion is enabled, Framer Motion is configured globally with `reducedMotion="user"`, landing-page reveal animations render instantly, and page-transition placeholders keep their loading feedback visible without slide/pulse motion.

To verify locally, open browser rendering tools or OS accessibility settings, enable reduced motion, then reload the app. The hero and scroll-reveal sections should appear without movement, and route-change placeholders should remain visible without animated transitions.

## Worker Tracing

Asynchronous worker execution paths are instrumented via `src/tracing/worker-tracing.service.ts`.

### What is traced

| Worker | Span name |
|---|---|
| `/api/signals` route handler | `worker:signals:fetch` |
| Freighter wallet connect | `worker:wallet:connect` |
| Signal price polling interval | `worker:signalPrice:poll` |

### API

```ts
// Wrap any async function — returns its result, re-throws on error
const data = await traceWorker("worker:my:task", async () => fetchData(), { page: 1 });

// Manual span lifecycle
const finish = startSpan("worker:my:task", { key: "value" });
try {
  await doWork();
  finish("ok");
} catch (err) {
  finish("error", err as Error);
}
```

Each span captures: `traceId`, `spanId`, `name`, `startedAt`, `endedAt`, `durationMs`, `status`, `attributes`, and `error` (if any).

In development (`NODE_ENV=development`) spans are logged to `console.debug`. Replace the `emit` function in the service to forward spans to any observability backend (Datadog, OpenTelemetry, etc.).

### Security

- Attributes are caller-controlled — the service never reads or mutates them.
- No secrets are injected or logged by the tracing layer itself.
- Existing authentication and authorization semantics are fully preserved.

### Running tests

```bash
npm test
```
