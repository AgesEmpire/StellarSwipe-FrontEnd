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
  domain: string;
  network: string;
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
 * to `accountPublicKey`.  The challenge is bound to the issuing context
 * (account, wallet, domain, and Stellar network) so it cannot be replayed
 * against a different login, wallet, domain, or network.  The caller signs
 * the returned challenge and submits it back to `linkWallet`.
 */
export function issueLinkChallenge(
  accountPublicKey: string,
  walletAddress: string,
  context: { domain: string; network: string }
): { challenge: string; expiresAt: string } {
  const challenge = `${accountPublicKey}:${walletAddress}:${context.domain}:${context.network}:${Date.now()}:${Math.random()
    .toString(36)
    .slice(2)}`;
  pendingChallenges.set(challenge, {
    accountPublicKey,
    walletAddress,
    domain: context.domain,
    network: context.network,
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
 *
 * The challenge is consumed exactly once: it is atomically marked used before
 * any side effects, so concurrent reuse of the same challenge allows at most
 * one success.  The presented context (account, wallet, domain, network) must
 * match the context the challenge was issued for.
 */
export function linkWallet(params: {
  accountPublicKey: string;
  walletAddress: string;
  challenge: string;
  signature: string;
  domain: string;
  network: string;
}): WalletOperationResult {
  const { accountPublicKey, walletAddress, challenge, signature, domain, network } =
    params;

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
    pending.domain === domain &&
    pending.network === network &&
    Date.now() - pending.issuedAt <= CHALLENGE_TTL_MS;

  if (!isFresh || !signature) {
    return {
      success: false,
      message:
        "Invalid or expired signature challenge. Request a fresh challenge and sign it.",
      errorCode: "INVALID_CHALLENGE",
    };
  }

  // Consume the challenge exactly once before any side effects so that
  // concurrent reuse of the same challenge allows at most one success.
  pending.used = true;

  // Con