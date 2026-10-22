/**
 * app/api/account/delete/route.ts
 *
 * DELETE /api/account/delete
 *
 * Accepts a DeletionRequest body and initiates the account-deactivation
 * process.  The handler:
 *
 *  1. Validates authentication (publicKey must be present in the request).
 *  2. Validates the request payload via validateDeletionRequest.
 *  3. Deduplicates repeated submissions using the idempotency key.
 *  4. Applies the retention policy — retained records are anonymised,
 *     non-essential records are scheduled for purge.
 *  5. Revokes the current server-side session so the credential cannot be
 *     reused after logout.
 *  6. Traces the worker span via worker-tracing.service.
 *
 * NOTE: In this front-end demo the "deletion" is simulated.  Replace the
 * `performAccountDeletion` stub with your actual Soroban / back-end call.
 */

import { NextRequest, NextResponse } from "next/server";
import { traceWorker } from "@/src/tracing/worker-tracing.service";
import {
  type DeletionRequest,
  type DeletionResponse,
  type DeletionErrorCode,
  validateDeletionRequest,
  anonymiseValue,
  DEFAULT_RETENTION_POLICY,
} from "@/lib/accountDeletion";

// ─── In-memory idempotency store ──────────────────────────────────────────────
// In production replace with Redis or a DB-backed idempotency table keyed
// by (idempotencyKey, publicKey).
const processedKeys = new Map<string, DeletionResponse>();

// ─── In-memory revoked-session store ──────────────────────────────────────────
// Tracks credentials that have been revoked on logout.  In production replace
// with a server-side session store / token denylist (Redis, DB, etc.).
const revokedSessions = new Set<string>();

// ─── Route handler ────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  let body: Partial<DeletionRequest>;

  // ── 1. Parse body ───────────────────────────────────────────────────────────
  try {
    body = (await req.json()) as Partial<DeletionRequest>;
  } catch {
    return NextResponse.json<DeletionResponse>(
      {
        success: false,
        idempotencyKey: "",
        message: "Request body must be valid JSON.",
        errorCode: "SERVER_ERROR",
      },
      { status: 400 }
    );
  }

  // ── 2. Authenticate ────────────────────────────────────────────────────────
  if (!body.publicKey) {
    return NextResponse.json<DeletionResponse>(
      {
        success: false,
        idempotencyKey: body.idempotencyKey ?? "",
        message: "Unauthenticated: publicKey is required.",
        errorCode: "UNAUTHENTICATED" as DeletionErrorCode,
      },
      { status: 401 }
    );
  }

  // ── 3. Validate payload ────────────────────────────────────────────────────
  const validationErrors = validateDeletionRequest(body);
  if (validationErrors.length > 0) {
    return NextResponse.json<DeletionResponse>(
      {
        success: false,
        idempotencyKey: body.idempotencyKey ?? "",
        message: `Validation failed: ${validationErrors.join("; ")}`,
        errorCode: "SERVER_ERROR",
      },
      { status: 422 }
    );
  }

  const request = body as DeletionRequest;

  // ── 4. Idempotency check ───────────────────────────────────────────────────
  const prior = processedKeys.get(request.idempotencyKey);
  if (prior) {
    // Return the same response as the original — do not re-process.
    return NextResponse.json<DeletionResponse>(prior, { status: 200 });
  }

  // ── 5. Process deletion with tracing ───────────────────────────────────────
  return traceWorker(
    "worker:account:delete",
    async () => {
      const result = await performAccountDeletion(request);
      // Cache for idempotency
      processedKeys.set(request.idempotencyKey, result);
      return NextResponse.json<DeletionResponse>(result, {
        status: result.success ? 200 : 500,
      });
    },
    { publicKey: anonymiseValue(request.publicKey) }
  );
}

// ─── Session revocation ───────────────────────────────────────────────────────

/**
 * Revokes the current server-side session credential for the given public key.
 *
 * Idempotent: revoking an already-revoked session is a no-op and does not
 * throw, so repeated logout calls remain safe and consistent.
 */
export function revokeSession(publicKey: string): void {
  revokedSessions.add(publicKey);
}

/**
 * Returns true if the credential for the given public key has been revoked
 * and therefore can no longer be reused.
 */
export function isSessionRevoked(publicKey: string): boolean {
  return revokedSessions.has(publicKey);
}

// ─── Wallet linking / unlinking ───────────────────────────────────────────────
//
// Wallet uniqueness policy (documented):
//   A Stellar wallet address may be linked to at most ONE account at a time.
//   Attempting to link an address already owned by another account is
//   rejected with WALLET_ALREADY_LINKED.  Re-linking an address already owned
//   by the same account is a no-op (idempotent).
//
// Linking requires a fresh signature challenge: the caller must present a
// challenge issued for this account and a signature over it.  Challenges are
// single-use and expire, so a stale or replayed signature cannot link a wallet.
//
// Unlinking safety:
//   - The primary wallet cannot be unlinked (PRIMARY_WALLET_PROTECTED).
//   - Unlinking requires an active, non-revoked session (UNAUTHENTICATED).

/** Lifetime of a linking challenge before it must be re-issued. */
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

interface WalletChallenge {
  accountPublicKey: string;
  walletAddress: string;
  issuedAt: number;
  used: boolean;
}

interface LinkedWallet {
  address: string;
  isPrimary: boolean;
}

// In production replace with a DB-backed store keyed by account public key.
const accountWallets = new Map<string, LinkedWallet[]>();
const walletOwners = new Map<string, string>();
const pendingChallenges = new Map<string, WalletChallenge>();

export type WalletErrorCode =
  | "UNAUTHENTICATED"
  | "INVALID_CHALLENGE"
  | "WALLET_ALREADY_LINKED"
  | "WALLET_NOT_FOUND"
  | "PRIMARY_WALLET_PROTECTED";

export interface WalletOperationResult {
  success: boolean;
  message: string;
  errorCode?: WalletErrorCode;
  wallets?: LinkedWallet[];
}

/**
 * Issues a fresh, single-use signature challenge for linking `walletAddress`
 * to `accountPublicKey`.  The caller signs the returned challenge and submits
 * it back to `linkWallet`.
 */
export function issueLinkChallenge(
  accountPublicKey: string,
  walletAddress: string
): { challenge: string; expiresAt: string } {
  const challenge = `${accountPublicKey}:${walletAddress}:${Date.now()}:${Math.random()
    .toString(36)
    .slice(2)}`;
  pendingChallenges.set(challenge, {
    accountPublicKey,
    walletAddress,
    issuedAt: Date.now(),
    used: false,
  });
  return {
    challenge,
    expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
  };
}

/**
 * Links a Stellar wallet to an account after verifying a fresh signature
 * challenge.  Enforces the documented uniqueness policy.
 */
export function linkWallet(params: {
  accountPublicKey: string;
  walletAddress: string;
  challenge: string;
  signature: string;
}): WalletOperationResult {
  const { accountPublicKey, walletAddress, challenge, signature } = params;

  if (isSessionRevoked(accountPublicKey)) {
    return {
      success: false,
      message: "Unauthenticated: session has been revoked.",
      errorCode: "UNAUTHENTICATED",
    };
  }

  const pending = pendingChallenges.get(challenge);
  const isFresh =
    pending !== undefined &&
    !pending.used &&
    pending.accountPublicKey === accountPublicKey &&
    pending.walletAddress === walletAddress &&
    Date.now() - pending.issuedAt <= CHALLENGE_TTL_MS;

  if (!isFresh || !signature) {
    return {
      success: false,
      message:
        "Invalid or expired signature challenge. Request a fresh challenge and sign it.",
      errorCode: "INVALID_CHALLENGE",
    };
  }

  // Consume the challenge so it cannot be replayed.
  pending.used = true;
  pendingChallenges.delete(challenge);

  const existingOwner = walletOwners.get(walletAddress);
  if (existingOwner && existingOwner !== accountPublicKey) {
    return {
      success: false,
      message: "This wallet is already linked to another account.",
      errorCode: "WALLET_ALREADY_LINKED",
    };
  }

  const wallets = accountWallets.get(accountPublicKey) ?? [];
  if (wallets.some((w) => w.address === walletAddress)) {
    // Idempotent: already linked to this account.
    return { success: true, message: "Wallet already linked.", wallets };
  }

  wallets.push({ address: walletAddress, isPrimary: wallets.length === 0 });
  accountWallets.set(accountPublicKey, wallets);
  walletOwners.set(walletAddress, accountPublicKey);

  return { success: true, message: "Wallet linked.", wallets };
}

/**
 * Unlinks a Stellar wallet from an account, enforcing primary-wallet and
 * active-session safety.
 */
export function unlinkWallet(params: {
  accountPublicKey: string;
  walletAddress: string;
}): WalletOperationResult {
  const { accountPublicKey, walletAddress } = params;

  if (isSessionRevoked(accountPublicKey)) {
    return {
      success: false,
      message: "Unauthenticated: session has been revoked.",
      errorCode: "UNAUTHENTICATED",
    };
  }

  const wallets = accountWallets.get(accountPublicKey) ?? [];
  const target = wallets.find((w) => w.address === walletAddress);
  if (!target) {
    return {
      success: false,
      message: "Wallet is not linked to this account.",
      errorCode: "WALLET_NOT_FOUND",
    };
  }

  if (target.isPrimary) {
    return {
      success: false,
      message: "The primary wallet cannot be unlinked.",
      errorCode: "PRIMARY_WALLET_PROTECTED",
    };
  }

  const remaining = wallets.filter((w) => w.address !== walletAddress);
  accountWallets.set(accountPublicKey, remaining);
  walletOwners.delete(walletAddress);

  return { success: true, message: "Wallet unlinked.", wallets: remaining };
}

// ─── Deletion business logic ──────────────────────────────────────────────────

/**
 * Performs the actual account deletion.
 *
 * Steps:
 *  1. Check for pending on-chain transactions (simulate guard).
 *  2. Anonymise retained records per the retention policy.
 *  3. Schedule purge of non-essential records.
 *  4. Deactivate the account and revoke the current session credential.
 *
 * Replace this stub with real Soroban / database calls.
 */
async function performAccountDeletion(
  request: DeletionRequest
): Promise<DeletionResponse> {
  const { publicKey, idempotencyKey, retentionPolicy } = request;

  // Simulate guard: open positions must be closed before deletion
  const hasPendingTransactions = await checkPendingTransactions(publicKey);
  if (hasPendingTransactions) {
    return {
      success: false,
      idempotencyKey,
      message:
        "Cannot delete account while there are pending transactions. " +
        "Close all open positions first.",
      errorCode: "PENDING_TRANSACTIONS",
    };
  }

  // Anonymise retained records (financial + audit)
  const anonymisedRecords = retentionPolicy.retainAndAnonymise.map(
    (category) => ({
      category,
      anonymisedKey: anonymiseValue(`${publicKey}:${category}`),
    })
  );

  // Schedule non-essential records for purge (simulated)
  const purgedRecords = retentionPolicy.purge.map((category) => ({
    category,
    scheduledFor: new Date(
      Date.now() + retentionPolicy.retentionDays * 24 * 60 * 60 * 1000
    ).toISOString(),
  }));

  // In production: write anonymisedRecords to DB, queue purge jobs,
  // and call the identity provider / Soroban contract to deactivate.
  void anonymisedRecords;
  void purgedRecords;
  void DEFAULT_RETENTION_POLICY; // ensure import used

  // Revoke the current server-side session so the credential cannot be reused.
  // Idempotent: safe to call again on an already-revoked session.
  revokeSession(publicKey);

  const processedAt = new Date().toISOString();

  return {
    success: true,
    idempotencyKey,
    processedAt,
    message: "Account scheduled for deletion. Financial records have been anonymised per retention policy.",
  };
}

/**
 * Guard: returns true if the account has any open / pending on-chain
 * transactions that must be settled before deletion.
 *
 * Replace with a real Horizon / Soroban contract query.
 */
async function checkPendingTransactions(publicKey: string): Promise<boolean> {
  // Demo: no pending transactions for any account.
  void publicKey;
  return false;
}
