import { Networks } from "@stellar/stellar-sdk";
import { randomBytes } from "crypto";

export type StellarNetwork = "mainnet" | "testnet" | "futurenet";

export interface NetworkConfig {
  name: StellarNetwork;
  passphrase: string;
  horizonUrl: string;
}

export const NETWORKS: Record<StellarNetwork, NetworkConfig> = {
  mainnet: {
    name: "mainnet",
    passphrase: Networks.PUBLIC,
    horizonUrl: "https://horizon.stellar.org",
  },
  testnet: {
    name: "testnet",
    passphrase: Networks.TESTNET,
    horizonUrl: "https://horizon-testnet.stellar.org",
  },
  futurenet: {
    name: "futurenet",
    passphrase: Networks.FUTURENET,
    horizonUrl: "https://horizon-futurenet.stellar.org",
  },
};

export function getNetworkConfig(network: StellarNetwork): NetworkConfig {
  const config = NETWORKS[network];
  if (!config) {
    throw new Error(`Unsupported Stellar network: ${network}`);
  }
  return config;
}

export interface AuthChallenge {
  /** Unpredictable, cryptographically secure nonce (hex). */
  nonce: string;
  /** Domain requesting the signature. */
  domain: string;
  /** Stellar network the challenge is valid for. */
  network: StellarNetwork;
  /** Stellar network passphrase bound to the challenge. */
  networkPassphrase: string;
  /** Wallet address the challenge is bound to. */
  walletAddress: string;
  /** ISO timestamp after which the challenge is invalid. */
  expiresAt: string;
  /** Human-readable message the wallet owner signs. */
  message: string;
}

export interface CreateChallengeOptions {
  domain: string;
  network: StellarNetwork;
  walletAddress: string;
  /** Time-to-live in milliseconds. Defaults to 5 minutes. */
  ttlMs?: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const NONCE_BYTES = 32;

/**
 * Create a short-lived, one-time authentication challenge bound to a wallet.
 * The nonce is generated with crypto-secure randomness so it cannot be
 * predicted or replayed.
 */
export function createAuthChallenge(
  options: CreateChallengeOptions,
): AuthChallenge {
  const { domain, network, walletAddress, ttlMs = DEFAULT_TTL_MS } = options;

  if (!domain || typeof domain !== "string") {
    throw new Error("A domain is required to create an auth challenge");
  }
  if (!walletAddress || typeof walletAddress !== "string") {
    throw new Error("A wallet address is required to create an auth challenge");
  }
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
    throw new Error("Challenge TTL must be a positive number of milliseconds");
  }

  const config = getNetworkConfig(network);
  const nonce = randomBytes(NONCE_BYTES).toString("hex");
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();

  const message = [
    `${domain} wants you to sign in with your Stellar account:`,
    walletAddress,
    "",
    `Network: ${config.name}`,
    `Nonce: ${nonce}`,
    `Expires At: ${expiresAt}`,
  ].join("\n");

  return {
    nonce,
    domain,
    network,
    networkPassphrase: config.passphrase,
    walletAddress,
    expiresAt,
    message,
  };
}

/**
 * Validate a challenge against the requested wallet and current time.
 * Rejects malformed challenges, mismatched wallets, and expired challenges.
 */
export function verifyAuthChallenge(
  challenge: AuthChallenge,
  walletAddress: string,
  now: number = Date.now(),
): boolean {
  if (!challenge || typeof challenge !== "object") {
    return false;
  }

  const { nonce, domain, network, walletAddress: boundWallet, expiresAt } =
    challenge;

  if (typeof nonce !== "string" || nonce.length === 0) {
    return false;
  }
  if (typeof domain !== "string" || domain.length === 0) {
    return false;
  }
  if (!(network in NETWORKS)) {
    return false;
  }
  if (typeof boundWallet !== "string" || boundWallet.length === 0) {
    return false;
  }
  if (typeof expiresAt !== "string") {
    return false;
  }

  // Challenge must be bound to the requested wallet.
  if (boundWallet !== walletAddress) {
    return false;
  }

  const expiry = Date.parse(expiresAt);
  if (Number.isNaN(expiry)) {
    return false;
  }

  // Reject expired challenges.
  if (expiry <= now) {
    return false;
  }

  return true;
}
