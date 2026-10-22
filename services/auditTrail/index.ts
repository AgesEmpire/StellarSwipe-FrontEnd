/**
 * Append-only audit trail for security-sensitive account and trading actions.
 *
 * Design constraints (issue #949):
 *  - Entries capture actor, action, target reference, timestamp and correlation ID.
 *  - Secrets, signatures and other credential-like values are excluded before an
 *    entry is ever stored — both in memory and in persisted storage.
 *  - Sensitive operations (trade execution, wallet connect/disconnect, transaction
 *    signing, webhook registration) create entries; read-only operations do not.
 *  - The trail is append-only: there is no API to update or delete individual
 *    entries. The only reset is `resetAuditTrail()`, which exists for tests.
 */

export interface AuditEntry {
  /** Unique id of this entry. */
  id: string;
  /** ISO-8601 timestamp of when the action occurred. */
  timestamp: string;
  /** Who performed the action (wallet public key, "user", or "system"). */
  actor: string;
  /** What was done, e.g. "trade.executed", "wallet.connected". */
  action: string;
  /** Reference to the affected resource, e.g. trade id, webhook id, address. */
  target: string;
  /** Correlation id tying this entry to a request/operation trace. */
  correlationId: string;
  /** Optional non-sensitive context. Sanitized before storage. */
  metadata?: Record<string, unknown>;
}

export interface AuditEntryInput {
  actor?: string;
  action: string;
  target: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

/** Catalog of sensitive actions that must produce audit entries. */
export const AUDIT_ACTIONS = {
  WALLET_CONNECTED: 'wallet.connected',
  WALLET_DISCONNECTED: 'wallet.disconnected',
  TRANSACTION_SIGNED: 'transaction.signed',
  TRANSACTION_SIGN_FAILED: 'transaction.sign_failed',
  TRADE_EXECUTED: 'trade.executed',
  WEBHOOK_CREATED: 'webhook.created',
  WEBHOOK_DELETED: 'webhook.deleted',
} as const;

/**
 * Keys whose values must never appear in an audit entry. Matching is done on
 * the key name (case-insensitive) at any nesting level.
 */
const SENSITIVE_KEY_PATTERN =
  /(secret|signature|password|passphrase|private[_-]?key|mnemonic|seed|token|api[_-]?key|authorization|cookie|credential|otp|backup[_-]?code)/i;

/** Maximum recursion depth when sanitizing metadata. */
const MAX_SANITIZE_DEPTH = 4;
/** Upper bound on stored entries so the trail cannot grow without limit. */
const MAX_ENTRIES = 1000;
/** localStorage key used to persist the trail across reloads. */
export const AUDIT_TRAIL_STORAGE_KEY = 'stellarswipe:audit-trail';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Generate a correlation id for a new operation. */
export function newCorrelationId(): string {
  return generateId();
}

/**
 * Deep-copy metadata while dropping any credential-like key. Values under a
 * matching key are excluded entirely (not redacted in place) so they can never
 * leak via `JSON.stringify` of an entry.
 */
export function sanitizeAuditMetadata(
  value: unknown,
  depth = 0
): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (depth >= MAX_SANITIZE_DEPTH) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeAuditMetadata(item, depth + 1))
      .filter((item) => item !== undefined);
  }
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) continue; // exclude secrets/signatures
    const sanitized = sanitizeAuditMetadata(val, depth + 1);
    if (sanitized !== undefined) clean[key] = sanitized;
  }
  return clean;
}

// ─── Append-only store ───────────────────────────────────────────────────────

let entries: AuditEntry[] = loadPersistedEntries();

function loadPersistedEntries(): AuditEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(AUDIT_TRAIL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AuditEntry[]) : [];
  } catch {
    return [];
  }
}

function persistEntries(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      AUDIT_TRAIL_STORAGE_KEY,
      JSON.stringify(entries)
    );
  } catch {
    // Storage unavailable (private mode, quota) — in-memory trail still works.
  }
}

/**
 * Append a security-sensitive action to the audit trail.
 *
 * The entry is frozen, secrets/signatures are excluded from `metadata`, and
 * there is no way to modify or remove the entry afterwards.
 */
export function recordAuditEntry(input: AuditEntryInput): AuditEntry {
  const entry: AuditEntry = Object.freeze({
    id: generateId(),
    timestamp: new Date().toISOString(),
    actor: input.actor?.trim() ? input.actor.trim() : 'system',
    action: input.action,
    target: input.target,
    correlationId: input.correlationId ?? newCorrelationId(),
    metadata: input.metadata
      ? (sanitizeAuditMetadata(input.metadata) as Record<string, unknown>)
      : undefined,
  });

  entries = [...entries, entry].slice(-MAX_ENTRIES);
  persistEntries();
  return entry;
}

/**
 * Read the audit trail. Returns a copy — callers cannot mutate the store, and
 * reading never creates an entry.
 */
export function getAuditEntries(): ReadonlyArray<AuditEntry> {
  return [...entries];
}

/**
 * Read entries matching an action (e.g. AUDIT_ACTIONS.TRADE_EXECUTED).
 * Read-only — never creates an entry.
 */
export function getAuditEntriesByAction(action: string): ReadonlyArray<AuditEntry> {
  return entries.filter((e) => e.action === action);
}

/**
 * Clear the entire trail.
 *
 * @internal Test-only. The audit trail is append-only in production code;
 * individual entries can never be updated or deleted.
 */
export function resetAuditTrail(): void {
  entries = [];
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(AUDIT_TRAIL_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
