import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';

export interface Principal {
  accountId: string;
  walletAddress: string;
  issuedAt: number;
  expiresAt: number;
}

export interface ServerIssuedCredential {
  token: string;
  accountId: string;
  walletAddress: string;
  issuedAt: number;
  expiresAt: number;
  revokedAt?: number | null;
}

/**
 * Resolves authenticated principals from server-issued credentials.
 *
 * Credentials are looked up in a server-side store so that missing, expired,
 * and revoked tokens all surface as a consistent UnauthorizedException.
 */
@Injectable()
export class PrincipalService {
  private readonly credentials = new Map<string, ServerIssuedCredential>();

  /**
   * Register a server-issued credential. Intended for the issuing flow and
   * tests; guards only ever read from this store.
   */
  issue(credential: ServerIssuedCredential): void {
    this.credentials.set(this.fingerprint(credential.token), credential);
  }

  /**
   * Revoke a previously issued credential. Revoked credentials are rejected
   * by {@link resolve} with the same unauthorized response as missing ones.
   */
  revoke(token: string): void {
    const key = this.fingerprint(token);
    const existing = this.credentials.get(key);
    if (existing) {
      this.credentials.set(key, { ...existing, revokedAt: Date.now() });
    }
  }

  /**
   * Resolve the authenticated principal for a raw credential token.
   *
   * Throws UnauthorizedException for missing, malformed, expired, or revoked
   * credentials so callers always observe a consistent 401 response.
   */
  resolve(token: string | null | undefined): Principal {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Missing credentials');
    }

    const credential = this.credentials.get(this.fingerprint(token));
    if (!credential) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (credential.revokedAt != null) {
      throw new UnauthorizedException('Credentials revoked');
    }

    const now = Date.now();
    if (credential.expiresAt <= now) {
      throw new UnauthorizedException('Credentials expired');
    }

    return {
      accountId: credential.accountId,
      walletAddress: credential.walletAddress,
      issuedAt: credential.issuedAt,
      expiresAt: credential.expiresAt,
    };
  }

  /**
   * Constant-time comparison helper for callers that need to verify a token
   * against a known value without leaking timing information.
   */
  matches(expected: string, actual: string): boolean {
    const a = Buffer.from(this.fingerprint(expected));
    const b = Buffer.from(this.fingerprint(actual));
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  }

  private fingerprint(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
