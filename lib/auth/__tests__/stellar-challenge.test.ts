import {
  createStellarChallenge,
  isChallengeExpired,
  verifyStellarChallenge,
} from '../stellar-challenge';

const WALLET = 'GA' + 'A'.repeat(53);
const OTHER_WALLET = 'GB' + 'B'.repeat(53);
const DOMAIN = 'example.com';
const NETWORK = 'testnet' as const;

describe('createStellarChallenge', () => {
  it('includes an unpredictable nonce, domain, network, and expiry', () => {
    const now = 1_700_000_000_000;
    const challenge = createStellarChallenge({
      wallet: WALLET,
      domain: DOMAIN,
      network: NETWORK,
      ttlSeconds: 300,
      now,
    });

    expect(challenge.nonce).toMatch(/^[0-9a-f]{64}$/);
    expect(challenge.domain).toBe(DOMAIN);
    expect(challenge.network).toBe(NETWORK);
    expect(challenge.expiresAt).toBe(now + 300_000);
    expect(challenge.message).toContain(challenge.nonce);
    expect(challenge.message).toContain(DOMAIN);
    expect(challenge.message).toContain(NETWORK);
  });

  it('generates a unique nonce per challenge', () => {
    const a = createStellarChallenge({ wallet: WALLET, domain: DOMAIN, network: NETWORK });
    const b = createStellarChallenge({ wallet: WALLET, domain: DOMAIN, network: NETWORK });
    expect(a.nonce).not.toBe(b.nonce);
  });

  it('binds the challenge to the requested wallet', () => {
    const challenge = createStellarChallenge({ wallet: WALLET, domain: DOMAIN, network: NETWORK });
    expect(challenge.wallet).toBe(WALLET);
    expect(challenge.message).toContain(WALLET);
  });

  it('rejects malformed wallet addresses', () => {
    expect(() =>
      createStellarChallenge({ wallet: 'not-a-wallet', domain: DOMAIN, network: NETWORK }),
    ).toThrow();
  });
});

describe('verifyStellarChallenge', () => {
  it('accepts a fresh challenge bound to the requested wallet', () => {
    const now = 1_700_000_000_000;
    const challenge = createStellarChallenge({
      wallet: WALLET,
      domain: DOMAIN,
      network: NETWORK,
      now,
    });
    expect(verifyStellarChallenge(challenge, WALLET, now + 1000)).toEqual({ valid: true });
  });

  it('rejects expired challenges', () => {
    const now = 1_700_000_000_000;
    const challenge = createStellarChallenge({
      wallet: WALLET,
      domain: DOMAIN,
      network: NETWORK,
      ttlSeconds: 60,
      now,
    });
    expect(isChallengeExpired(challenge, now + 60_000)).toBe(true);
    const result = verifyStellarChallenge(challenge, WALLET, now + 60_000);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Challenge expired');
  });

  it('rejects challenges bound to a different wallet', () => {
    const challenge = createStellarChallenge({ wallet: WALLET, domain: DOMAIN, network: NETWORK });
    const result = verifyStellarChallenge(challenge, OTHER_WALLET);
    expect(result.valid).toBe(false);
  });

  it('rejects malformed challenges', () => {
    expect(verifyStellarChallenge(null as any, WALLET).valid).toBe(false);
    expect(
      verifyStellarChallenge(
        { wallet: WALLET, nonce: 'short', domain: DOMAIN, network: NETWORK, issuedAt: 0, expiresAt: 1, message: '' },
        WALLET,
      ).valid,
    ).toBe(false);
  });
});
