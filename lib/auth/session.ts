import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { verifyChallengeSignature } from "./stellar-challenge";

export const SESSION_COOKIE = "session";

export interface Session {
  id: string;
  wallet: string;
  createdAt: number;
}

export interface CreateSessionInput {
  wallet: string;
  challenge: string;
  signature: string;
}

const sessions = new Map<string, Session>();

/**
 * Create an authenticated session only after the signed login challenge has
 * been verified against the claimed Stellar wallet.
 *
 * Returns null when the signature is invalid or the signer does not match the
 * claimed wallet, so no session can be created in those cases.
 */
export async function createSession(
  input: CreateSessionInput,
): Promise<Session | null> {
  const { wallet, challenge, signature } = input;

  const isValid = verifyChallengeSignature({ wallet, challenge, signature });
  if (!isValid) {
    return null;
  }

  const session: Session = {
    id: randomUUID(),
    wallet,
    createdAt: Date.now(),
  };

  sessions.set(session.id, session);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return session;
}

export function getSession(id: string | undefined): Session | null {
  if (!id) {
    return null;
  }
  return sessions.get(id) ?? null;
}

export function destroySession(id: string | undefined): void {
  if (!id) {
    return;
  }
  sessions.delete(id);
}
