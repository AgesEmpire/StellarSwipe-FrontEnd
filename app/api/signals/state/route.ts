import { NextRequest, NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/providerFollows";
import { getUserSignalState, updateSignalAnnotation } from "@/lib/signalState";

/**
 * GET /api/signals/state
 * Lists the bookmarked signal IDs and dismissals for the authenticated user.
 * Only the caller's own state is returned.
 */
export async function GET(req: NextRequest) {
  const userId = getRequestUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  return NextResponse.json(getUserSignalState(userId), { status: 200 });
}

/**
 * PATCH /api/signals/state
 * Creates or edits the caller's private note and tags for a bookmarked signal.
 * Annotations are keyed by user + signal so they stay attached to the correct
 * signal after reload, and never touch provider content.
 *
 * Body: { signalId: string, note?: string | null, tags?: string[] }
 */
export async function PATCH(req: NextRequest) {
  const userId = getRequestUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { signalId, note, tags } = body as {
    signalId?: unknown;
    note?: unknown;
    tags?: unknown;
  };

  if (typeof signalId !== "string" || signalId.trim() === "") {
    return NextResponse.json({ error: "signalId is required" }, { status: 400 });
  }

  if (note !== undefined && note !== null && typeof note !== "string") {
    return NextResponse.json({ error: "note must be a string or null" }, { status: 400 });
  }

  if (
    tags !== undefined &&
    (!Array.isArray(tags) || tags.some((tag) => typeof tag !== "string"))
  ) {
    return NextResponse.json({ error: "tags must be an array of strings" }, { status: 400 });
  }

  const normalizedTags =
    tags === undefined
      ? undefined
      : Array.from(
          new Set(
            (tags as string[])
              .map((tag) => tag.trim())
              .filter((tag) => tag.length > 0),
          ),
        );

  const updated = updateSignalAnnotation(userId, signalId, {
    ...(note !== undefined ? { note: note === null ? null : (note as string) } : {}),
    ...(normalizedTags !== undefined ? { tags: normalizedTags } : {}),
  });

  if (!updated) {
    return NextResponse.json(
      { error: "Signal is not bookmarked by this user" },
      { status: 404 },
    );
  }

  return NextResponse.json(updated, { status: 200 });
}
