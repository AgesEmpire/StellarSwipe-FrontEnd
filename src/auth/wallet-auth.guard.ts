import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

export interface AuthenticatedPrincipal {
  walletAddress: string;
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
}

export interface ServerIssuedCredential {
  walletAddress: string;
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
  revoked?: boolean;
}

export interface CredentialStore {
  find(sessionId: string): Promise<ServerIssuedCredential | null> | ServerIssuedCredential | null;
}

export interface AuthenticatedRequest extends Request {
  principal?: AuthenticatedPrincipal;
}

const BEARER_PREFIX = 'Bearer ';

@Injectable()
export class WalletAuthGuard implements CanActivate {
  constructor(private readonly credentialStore: CredentialStore) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing credentials');
    }

    const credential = await this.credentialStore.find(token);

    if (!credential) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (credential.revoked) {
      throw new UnauthorizedException('Credentials revoked');
    }

    if (credential.expiresAt <= Date.now()) {
      throw new UnauthorizedException('Credentials expired');
    }

    request.principal = {
      walletAddress: credential.walletAddress,
      sessionId: credential.sessionId,
      issuedAt: credential.issuedAt,
      expiresAt: credential.expiresAt,
    };

    return true;
  }

  private extractToken(request: AuthenticatedRequest): string | null {
    const header = request.headers?.authorization;

    if (typeof header !== 'string' || !header.startsWith(BEARER_PREFIX)) {
      return null;
    }

    const token = header.slice(BEARER_PREFIX.length).trim();
    return token.length > 0 ? token : null;
  }
}
