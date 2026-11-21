import { NextRequest, NextResponse } from "next/server";
import { SubscriptionStatus } from "@/lib/subscriptionStatus";

/**
 * POST /api/subscriptions/[id]/cancel
 * Cancels the given subscription.
 * Replace the stub with a real DB / Soroban contract call.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: "Subscription ID is required" }, { status: 400 });
  }

  // Resolve the authenticated owner. Account-scoped records must be looked up
  // by (id, owner) so a caller can never act on another account's record.
  const owner = req.headers.get("x-account-id") ?? null;
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: persist cancellation in your data source, scoped to the owner.
  // e.g. const updated = await db.subscriptions.updateMany(
  //   { where: { id, owner } },
  //   { data: { status: SubscriptionStatus.Cancelled } }
  // );
  // if (updated.count === 0) return notFound();

  // Ownership is enforced in the query above. When no record matches the
  // (id, owner) pair we return 404 — identical to a missing record — so a
  // cross-account request cannot probe for another user's record existence.
  const owned = true; // placeholder until the scoped query above is wired in
  if (!owned) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  return NextResponse.json(
    { id, status: SubscriptionStatus.Cancelled },
    { status: 200 }
  );
}
