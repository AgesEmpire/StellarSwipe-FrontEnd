import { NextRequest, NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/providerFollows";
import {
  addSignalBookmark,
  getSignalBookmarkAnnotation,
  isValidSignalId,
  removeSignalBookmark,
  updateSignalBookmarkAnnotation,
} from "@/lib/signalState";

const MAX_NOTE_LENGTH = 2000;
const MAX_TAG_LENGTH = 40;
const MAX_TAGS = 20;

/**
 * Normalizes a raw tags value into a de-duplicated, trimmed list of tags.
 * Returns null when the value is not a valid array of tags.
 */
function normalizeTags(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }

  const tags: string[] = [];

  for (const entry of raw) {
    if (typeof entry !== "string") {
      return null;
    }

    const tag = entry.trim();

    if (!tag) {
      continue;
    }

    if (tag.length > MAX_TAG_LENGTH) {
      return null;
    }

    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  }

  if (tags.length > MAX_TAGS) {
    return null;
  }

  return tags;
}

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
 * PATCH /api/signals/[signalId]/bookmark
 * Creates or updates the authenticated user's private annotation (note and
 * tags) for a bookmarked signal. Annotations are keyed by user + signal so
 * they stay associated with the correct signal across reloads, and they never
 * modify provider content.
 *
 * Ownership: annotations are scoped to the authenticated user's own bookmark.
 * A signal that is not bookmarked by the caller returns 404 (not 403) to avoid
 * leaking the existence of another account's record.
 */
export async function PATCH(
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

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const payload = body as { note?: unknown; tags?: unknown };
  const patch: { note?: string; tags?: string[] } = {};

  if (payload.note !== undefined) {
    if (typeof payload.note !== "string") {
      return NextResponse.json({ error: "Invalid note" }, { status: 400 });
    }

    if (payload.note.length > MAX_NOTE_LENGTH) {
      return NextResponse.json({ error: "Note is too long" }, { status: 400 });
    }

    patch.note = payload.note;
  }

  if (payload.tags !== undefined) {
    const tags = normalizeTags(payload.tags);

    if (!tags) {
      return NextResponse.json({ error: "Invalid tags" }, { status: 400 });
    }

    patch.tags = tags;
  }

  if (patch.note === undefined && patch.tags === undefined) {
    return NextResponse.json(
      { error: "Provide a note or tags to update" },
      { status: 400 }
    );
  }

  const annotation = updateSignalBookmarkAnnotation(userId, signalId, patch);

  if (!annotation) {
    return NextResponse.json({ error: "Signal not found" }, { status: 404 });
  }

  return NextResponse.json(
    { signalId, bookmarked: true, annotation },
    { status: 200 }
  );
}

/**
 * GET /api/signals/[signalId]/bookmark
 * Returns the authenticated user's private annotation for a bookmarked signal
 * so the client can restore notes and tags after reload.
 */
export async function GET(
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

  const annotation = getSignalBookmarkAnnotation(userId, signalId);

  if (!annotation) {
    return NextResponse.json({ error: "Signal not found" }, { status: 404 });
  }

  return NextResponse.json(
    { signalId, bookmarked: true, annotation },
    { status: 200 }
  );
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
