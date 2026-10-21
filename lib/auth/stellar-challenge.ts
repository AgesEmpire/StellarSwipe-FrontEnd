import { randomBytes } from 'crypto';

export type StellarNetwork = 'public' | 'testnet' | 'futurenet';

export interface StellarChallenge {
  wallet: string;
  nonce: string;
  domain: string;
  network: StellarNetwork;
  issuedAt: number;
  expiresAt: number;
  message: string;
}

export interface CreateChallengeOptions {
  wallet: string;
  domain: string;
  network: StellarNetwork;
  ttlSeconds?: number;
  now?: number;
}

const DEFAULT_TTL_SECONDS = 300;
const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;

export function isValidStellarAddress(wallet: string): boolean {
  return typeof wallet === 'string' && STELLAR_ADDRESS_RE.test(wallet);
}

function buildMessage(
  wallet: string,
  nonce: string,
  domain: string,
  network: StellarNetwork,
  issuedAt: number,
  expiresAt: number,
): string {
  return [
    `${domain} wants you to sign in with your Stellar account:`,
    wallet,
    '',
    `Network: ${network}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date(issuedAt).toISOString()}`,
    `Expiration Time: ${new Date(expiresAt).toISOString()}`,
  ].join('\n');
}

export function createStellarChallenge(options: CreateChallengeOptions): StellarChallenge {
  const { wallet, domain, network } = options;
  const ttlSeconds = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const now = options.now ?? Date.now();

  if (!isValidStellarAddress(wallet)) {
    throw new Error('Invalid Stellar wallet address');
  }
  if (!domain || typeof domain !== 'string') {
    throw new Error('Domain is required');
  }
  if (!['public', 'testnet', 'futurenet'].includes(network)) {
    throw new Error('Unsupported Stellar network');
  }
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error('Challenge TTL must be a positive number of seconds');
  }

  const nonce = randomBytes(32).toString('hex');
  const issuedAt = now;
  const expiresAt = now + ttlSeconds * 1000;

  return {
    wallet,
    nonce,
    domain,
    network,
    issuedAt,
    expiresAt,
    message: buildMessage(wallet, nonce, domain, network, issuedAt, expiresAt),
  };
}

export function isChallengeExpired(challenge: StellarChallenge, now: number = Date.now()): boolean {
  return now >= challenge.expiresAt;
}

export function verifyStellarChallenge(
  challenge: StellarChallenge,
  expectedWallet: string,
  now: number = Date.now(),
): { valid: boolean; reason?: string } {
  if (!challenge || typeof challenge !== 'object') {
    return { valid: false, reason: 'Malformed challenge' };
  }
  if (!isValidStellarAddress(challenge.wallet)) {
    return { valid: false, reason: 'Malformed wallet address' };
  }
  if (challenge.wallet !== expectedWallet) {
    return { valid: false, reason: 'Challenge is not bound to the requested wallet' };
  }
  if (typeof challenge.nonce !== 'string' || challenge.nonce.length < 32) {
    return { valid: false, reason: 'Malformed nonce' };
  }
  if (!challenge.domain || typeof challenge.domain !== 'string') {
    return { valid: false, reason: 'Malformed domain' };
  }
  if (!['public', 'testnet', 'futurenet'].includes(challenge.network)) {
    return { valid: false, reason: 'Malformed network' };
  }
  if (!Number.isFinite(challenge.expiresAt) || !Number.isFinite(challenge.issuedAt)) {
    return { valid: false, reason: 'Malformed timestamps' };
  }
  if (isChallengeExpired(challenge, now)) {
    return { valid: false, reason: 'Challenge expired' };
  }
  return { valid: true };
}
