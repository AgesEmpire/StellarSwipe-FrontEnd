export type ScopeImpact = "read" | "write";

export interface ApiKeyScope {
  id: string;
  label: string;
  description: string;
  impact: ScopeImpact;
  leastPrivilege?: boolean;
}

/**
 * Canonical list of API key scopes with human-readable descriptions and
 * explicit read/write impact. The least-privilege scope is flagged so the UI
 * can highlight it without preselecting broader access.
 */
export const API_KEY_SCOPES: ApiKeyScope[] = [
  {
    id: "read:invoices",
    label: "Read invoices",
    description: "View invoice details and download invoice documents.",
    impact: "read",
    leastPrivilege: true,
  },
  {
    id: "write:invoices",
    label: "Write invoices",
    description: "Create, update, and void invoices.",
    impact: "write",
  },
  {
    id: "read:customers",
    label: "Read customers",
    description: "View customer profiles and contact information.",
    impact: "read",
  },
  {
    id: "write:customers",
    label: "Write customers",
    description: "Create and update customer profiles.",
    impact: "write",
  },
  {
    id: "read:reports",
    label: "Read reports",
    description: "View tax and financial reports.",
    impact: "read",
  },
  {
    id: "write:reports",
    label: "Write reports",
    description: "Generate and export tax and financial reports.",
    impact: "write",
  },
];

const SCOPE_BY_ID: Record<string, ApiKeyScope> = API_KEY_SCOPES.reduce(
  (acc, scope) => {
    acc[scope.id] = scope;
    return acc;
  },
  {} as Record<string, ApiKeyScope>,
);

export function getScope(id: string): ApiKeyScope | undefined {
  return SCOPE_BY_ID[id];
}

export function getLeastPrivilegeScope(): ApiKeyScope | undefined {
  return API_KEY_SCOPES.find((scope) => scope.leastPrivilege);
}

export interface ScopeReviewSummary {
  selected: ApiKeyScope[];
  readCount: number;
  writeCount: number;
  hasWriteAccess: boolean;
  summary: string;
}

/**
 * Build an accurate review summary of the selected scopes so the user can
 * confirm permissions before the key is created.
 */
export function buildScopeReviewSummary(
  selectedIds: string[],
): ScopeReviewSummary {
  const selected = selectedIds
    .map((id) => getScope(id))
    .filter((scope): scope is ApiKeyScope => Boolean(scope));

  const readCount = selected.filter((scope) => scope.impact === "read").length;
  const writeCount = selected.filter(
    (scope) => scope.impact === "write",
  ).length;
  const hasWriteAccess = writeCount > 0;

  let summary: string;
  if (selected.length === 0) {
    summary = "No permissions selected. This key will not be able to access any data.";
  } else {
    const parts: string[] = [];
    if (readCount > 0) {
      parts.push(`${readCount} read`);
    }
    if (writeCount > 0) {
      parts.push(`${writeCount} write`);
    }
    summary = `${selected.length} permission${
      selected.length === 1 ? "" : "s"
    } selected (${parts.join(", ")}).`;
    if (hasWriteAccess) {
      summary += " This key can modify data.";
    } else {
      summary += " This key is read-only.";
    }
  }

  return { selected, readCount, writeCount, hasWriteAccess, summary };
}

/**
 * Public, non-secret identifier for an API key. This is safe to persist,
 * display, and log; it is derived from the key id and a short prefix of the
 * raw secret so users can recognize a key without exposing the secret itself.
 */
export interface ApiKeyPublicMetadata {
  /** Stable public identifier (e.g. "key_abc123"). */
  id: string;
  /** Short, non-reversible display prefix (e.g. "sk_live_ab12"). */
  prefix: string;
  /** Human-readable label chosen by the user. */
  name: string;
  /** Selected scope ids. */
  scopes: string[];
  /** ISO timestamp of creation. */
  createdAt: string;
  /** ISO timestamp of last use, if any. */
  lastUsedAt?: string;
  /** ISO timestamp of revocation, if any. */
  revokedAt?: string;
}

/**
 * The result of creating an API key. The `secret` is the ONLY place the raw
 * plaintext key is ever exposed; it must be shown to the user exactly once and
 * never persisted or logged. Everything else is safe metadata.
 */
export interface CreatedApiKey {
  /** Raw plaintext secret — show once, never store or log. */
  secret: string;
  /** Safe, persistable metadata (no secret material). */
  metadata: ApiKeyPublicMetadata;
}

/**
 * Build the safe public metadata for a key. Deliberately accepts only the
 * non-secret prefix (never the full secret) so plaintext cannot leak into
 * persisted or logged structures.
 */
export function buildApiKeyPublicMetadata(input: {
  id: string;
  prefix: string;
  name: string;
  scopes: string[];
  createdAt: string;
}): ApiKeyPublicMetadata {
  return {
    id: input.id,
    prefix: input.prefix,
    name: input.name,
    scopes: [...input.scopes],
    createdAt: input.createdAt,
  };
}

/**
 * Redact a raw secret for safe logging. Only a short prefix is retained so
 * operators can correlate a key without ever recording the full secret.
 */
export function redactApiKeySecret(secret: string): string {
  if (!secret) {
    return "";
  }
  const visible = secret.slice(0, 8);
  return `${visible}${"*".repeat(Math.max(0, secret.length - visible.length))}`;
}
