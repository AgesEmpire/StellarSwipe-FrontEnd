# Security Policy

## Supported Versions

StellarSwipe-FrontEnd ships continuously from the `main` branch — there are no
maintained release branches. Only the latest commit on `main` (what's
deployed in production) is supported with security fixes.

| Version         | Supported          |
| --------------- | ------------------ |
| `main` (latest) | :white_check_mark: |
| older commits   | :x:                |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report suspected vulnerabilities privately using GitHub's private
vulnerability reporting, via the **Security** tab on this repository, or
directly at:

<https://github.com/AgesEmpire/StellarSwipe-FrontEnd/security/advisories/new>

This is the same private-report channel referenced by the app's in-app
[Responsible Disclosure program](app/security/page.tsx) (see
[`content/security.ts`](content/security.ts) for the full scope and
reward-tier review process). When reporting, please include:

- A clear summary and the affected route, component, or contract call
- Reproducible steps and, where relevant, a proof-of-concept payload
- The impact you believe the issue has (e.g. wallet/funds risk, account
  takeover, data exposure)
- Screenshots or logs if useful

In scope: authentication and session handling, wallet connection and
transaction-signing flows, signal/portfolio/subscription/webhook data access,
and XSS/injection/authorization bypasses. Full scope and reward-tier
criteria are documented at `/security` in the app and in
[`content/security.ts`](content/security.ts).

### What to expect

- **Acknowledgement:** within 3 business days of your report.
- **Triage:** we will confirm whether the report is in scope and its
  severity within 7 business days.
- **Resolution:** timelines vary with severity and complexity; we will keep
  you updated as we work on a fix.

### Disclosure policy

We follow coordinated disclosure. Please give us a reasonable window to
investigate and remediate a confirmed issue before any public disclosure.
We'll credit reporters (unless you prefer to remain anonymous) once a fix
ships.

## Wallet Challenge Security

Wallet login challenges are single-use and bound to their original context.
Each signed challenge is tied to the wallet address, domain, and Stellar
network it was issued for, and is consumed exactly once on verification.
Replaying a challenge, reusing it across a different wallet, domain, or
network, or presenting an expired challenge is rejected. Concurrent reuse of
the same challenge allows at most one successful login.

## Session Credentials

Once wallet ownership is verified, the server issues two credentials:

- **Access credential** — short-lived and configurable via
  `AUTH_ACCESS_TTL_SECONDS` (defaults to a few minutes). It is the only
  credential accepted on authenticated API requests and is expected to
  expire quickly so a leaked token has a small blast radius.
- **Refresh credential** — longer-lived and used solely to mint a new access
  credential. It is never returned in a form that can be read by client
  JavaScript: it is delivered as an `HttpOnly`, `Secure`, `SameSite` cookie
  and validated server-side on each refresh. Refresh credentials are rotated
  on use, and a refresh that fails validation (expired, revoked, or bound to
  a different wallet) is rejected without issuing a new access credential.

All claims in issued credentials are derived from the trusted server-side
identity established during challenge verification (the verified wallet
address, the resolved Stellar network, and the server's own issuer/audience
settings). Client-supplied values are never trusted as claim sources, so a
caller cannot escalate or impersonate by crafting request fields. Issuance
and expiry behavior — including access-credential expiry and refresh
rejection after expiry — is covered by automated tests.
