import { NextRequest, NextResponse } from 'next/server';
import { Keypair } from '@stellar/stellar-sdk';
import { verifyChallenge } from '@/lib/auth/stellar-challenge';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { publicKey, signature, challenge } = (body ?? {}) as {
    publicKey?: unknown;
    signature?: unknown;
    challenge?: unknown;
  };

  if (
    typeof publicKey !== 'string' ||
    typeof signature !== 'string' ||
    typeof challenge !== 'string'
  ) {
    return NextResponse.json(
      { error: 'publicKey, signature and challenge are required' },
      { status: 400 },
    );
  }

  // Ensure the claimed wallet is a valid Stellar ed25519 public key (StrKey).
  let signer: Keypair;
  try {
    signer = Keypair.fromPublicKey(publicKey);
  } catch {
    return NextResponse.json({ error: 'Invalid Stellar public key' }, { status: 400 });
  }

  // Verify the signed challenge against the canonical payload and expected signer.
  const result = verifyChallenge({ publicKey, signature, challenge });
  if (!result.valid) {
    return NextResponse.json({ error: result.error ?? 'Invalid signature' }, { status: 401 });
  }

  // Guard against signer mismatch: the verifying key must match the claimed wallet.
  if (signer.publicKey() !== publicKey) {
    return NextResponse.json({ error: 'Signer mismatch' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, publicKey });
  response.cookies.set('session', publicKey, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return response;
}
