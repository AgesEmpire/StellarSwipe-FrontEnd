# Issue #949 - Audit Trail for Sensitive Account and Trading Actions

Maps implemented features to acceptance criteria.

## Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| Entries capture actor, action, target reference, timestamp, and correlation ID | ✅ `AuditEntry` schema |
| Secrets and signatures are excluded | ✅ key-based sanitization, applied before storage |
| Sensitive operations create entries and reads do not | ✅ instrumented below; verified by tests |

## Implemented

- **Append-only audit trail** – `services/auditTrail`. Entries are frozen, persisted to `localStorage` (`stellarswipe:audit-trail`), and capped at 1000. There is no API to update or delete individual entries; `resetAuditTrail()` exists for tests only.
- **Entry schema** – `AuditEntry`: `id`, `timestamp` (ISO-8601), `actor`, `action`, `target`, `correlationId`, optional sanitized `metadata`.
- **Secret exclusion** – `sanitizeAuditMetadata` drops any credential-like key (`secret`, `signature`, `password`, `privateKey`, `token`, `apiKey`, `seed`, `otp`, …) recursively before an entry is stored, so secrets/signatures can never leak via persisted storage or serialization.
- **Correlation IDs** – every entry has one; callers may pass their own (e.g. to tie an entry to a request trace) or let the trail generate one via `newCorrelationId()`.
- **Instrumented sensitive operations**:
  - `wallet.connected` / `wallet.disconnected` – `store/useWalletStore.ts` (`setPublicKey`, `disconnect`)
  - `transaction.signed` / `transaction.sign_failed` – `hooks/useWallet.ts` `sign()` (neither the XDR nor the signature is recorded)
  - `trade.executed` – `services/tradeExecutionService.ts` (success and failure attempts; result carries the `auditEntry`)
  - `webhook.created` / `webhook.deleted` – `store/useWebhookStore.ts` (the generated webhook secret is never recorded)
- **Reads do not create entries** – `getAuditEntries()` / `getAuditEntriesByAction()` return copies and never append; read-only service calls (rates, balances, estimates) are not instrumented.

## Files

| File | Role |
|------|------|
| `services/auditTrail/index.ts` | Append-only trail, entry schema, secret sanitizer, correlation IDs |
| `store/useWalletStore.ts` | Audits wallet connect/disconnect |
| `store/useWebhookStore.ts` | Audits webhook registration/removal (secret excluded) |
| `services/tradeExecutionService.ts` | Audits executed/failed trades |
| `hooks/useWallet.ts` | Audits transaction signing (signature excluded) |
| `services/auditTrail/__tests__/auditTrail.test.ts` | Unit tests for all acceptance criteria |
