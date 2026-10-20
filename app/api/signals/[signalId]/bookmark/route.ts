import { NextRequest, NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/providerFollows";
import {
  addSignalBookmark,
  isValidSignalId,
  removeSignalBookmark,
} from "@/lib/signalState";

/**
 * POST /api/signals/[signalId]/bookmark
 * Bookmarks the signal for the authenticated user. Idempotent: bookmarking an
 * already-bookmarked signal returns 200 without creating a duplicate.
 *
 * Ownership: bookmarks are always scoped to the authenticated user, so a
 * caller can only ever create a bookmark for their own account. The signal
 * must be visible to the caller; otherwise we return 404 (not 403) so that
 * cross-account access does not reveal whether another account's record
 * exists.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { signalId: string } }
) {
  const userId = getRequestUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { signalId } = params;

  if (!isValidSignalId(signalId)) {
    return NextResponse.json({ error: "Invalid signal ID" }, { status: 400 });
  }

  const result = addSignalBookmark(userId, signalId);

  if (!result) {
    return NextResponse.json({ error: "Signal not found" }, { status: 404 });
  }

  return NextResponse.json({ signalId, bookmarked: true }, { status: 200 });
}

/**
 * DELETE /api/signals/[signalId]/bookmark
 * Removes the bookmark for the authenticated user. Idempotent: removing a
 * signal that is not bookmarked returns 200.
 *
 * Ownership: removal is constrained to the authenticated user's own
 * bookmarks, so a caller cannot delete another account's bookmark. A signal
 * that is not visible to the caller returns 404 (not 403) to avoid leaking
 * the existence of another account's record.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { signalId: string } }
) {
  const userId = getRequestUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { signalId } = params;

  if (!isValidSignalId(signalId)) {
    return NextResponse.json({ error: "Invalid signal ID" }, { status: 400 });
  }

  const result = removeSignalBookmark(userId, signalId);

  if (!result) {
    return NextResponse.json({ error: "Signal not found" }, { status: 404 });
  }

  return NextResponse.json({ signalId, bookmarked: false }, { status: 200 });
}
