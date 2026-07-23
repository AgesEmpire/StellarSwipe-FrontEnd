"use client";

/**
 * ActiveSessionsPanel
 *
 * Lists all active sessions for the authenticated user and allows them to:
 *  - View device/browser label, approximate location, and last-active time
 *  - Identify their current session (cannot be revoked from here)
 *  - Revoke individual sessions optimistically (with rollback on failure)
 *  - Revoke all other sessions at once
 *
 * Props:
 *  - sessions        : initial session list (e.g. from SSR or a parent hook)
 *  - onRevoke        : async function(sessionId) → void  (API call)
 *  - onRevokeAll     : async function() → void           (bulk API call)
 *  - isLoading?      : show skeleton state
 *  - error?          : string — show an error notice instead of the list
 */

import { useState, useCallback } from "react";
import {
  Laptop,
  MapPin,
  Clock,
  ShieldAlert,
  LogOut,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  type Session,
  formatLastActive,
  canRevoke,
  otherSessionCount,
  optimisticRevoke,
  optimisticRevokeAll,
} from "@/lib/sessionUtils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ActiveSessionsPanelProps {
  sessions: Session[];
  onRevoke: (sessionId: string) => Promise<void>;
  onRevokeAll: () => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

// ---------------------------------------------------------------------------
// Skeleton rows shown while loading
// ---------------------------------------------------------------------------

function SessionSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="animate-pulse flex flex-col gap-1.5 py-3 border-b border-border last:border-0"
    >
      <div className="h-3 w-40 rounded bg-foreground/10" />
      <div className="h-2.5 w-28 rounded bg-foreground/10" />
      <div className="h-2.5 w-32 rounded bg-foreground/10" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single session row
// ---------------------------------------------------------------------------

interface SessionRowProps {
  session: Session;
  revoking: boolean;
  onRevoke: (id: string) => void;
}

function SessionRow({ session, revoking, onRevoke }: SessionRowProps) {
  const revokable = canRevoke(session);

  return (
    <div
      className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0"
      data-testid={`session-row-${session.id}`}
    >
      {/* Session info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <Laptop
            size={14}
            className="shrink-0 text-foreground-muted"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-foreground truncate">
            {session.deviceLabel}
          </span>
          {session.isCurrent && (
            <span
              className="inline-flex shrink-0 items-center rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-400"
              aria-label="This is your current session"
            >
              Current
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <MapPin
            size={12}
            className="shrink-0 text-foreground-muted"
            aria-hidden="true"
          />
          <span className="text-xs text-foreground-muted truncate">
            {session.location}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Clock
            size={12}
            className="shrink-0 text-foreground-muted"
            aria-hidden="true"
          />
          <span className="text-xs text-foreground-muted">
            Last active: {formatLastActive(session.lastActiveAt)}
          </span>
        </div>
      </div>

      {/* Revoke action */}
      {revokable ? (
        <Button
          variant="outline"
          size="sm"
          disabled={revoking}
          onClick={() => onRevoke(session.id)}
          aria-label={`Revoke session on ${session.deviceLabel}`}
          className="shrink-0 text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/60 disabled:opacity-50"
        >
          {revoking ? (
            <>
              <Loader2 size={13} className="animate-spin" aria-hidden="true" />
              <span className="sr-only">Revoking…</span>
            </>
          ) : (
            <>
              <LogOut size={13} aria-hidden="true" />
              Revoke
            </>
          )}
        </Button>
      ) : (
        /* Current session — no revoke button; hint to use normal sign-out */
        <span className="text-[11px] text-foreground-muted italic shrink-0 max-w-[90px] text-right leading-tight">
          Sign out to end this session
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function ActiveSessionsPanel({
  sessions: initialSessions,
  onRevoke,
  onRevokeAll,
  isLoading = false,
  error = null,
}: ActiveSessionsPanelProps) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  // Single-session revoke with optimistic update + rollback
  const handleRevoke = useCallback(
    async (id: string) => {
      const snapshot = sessions;
      setSessions(optimisticRevoke(sessions, id));
      setRevokingId(id);
      setRowError(null);
      try {
        await onRevoke(id);
      } catch {
        // Rollback on failure
        setSessions(snapshot);
        setRowError("Failed to revoke session. Please try again.");
      } finally {
        setRevokingId(null);
      }
    },
    [sessions, onRevoke]
  );

  // Bulk revoke with optimistic update + rollback
  const handleRevokeAll = useCallback(async () => {
    const snapshot = sessions;
    setSessions(optimisticRevokeAll(sessions));
    setRevokingAll(true);
    setRowError(null);
    try {
      await onRevokeAll();
    } catch {
      // Rollback on failure
      setSessions(snapshot);
      setRowError("Failed to revoke all sessions. Please try again.");
    } finally {
      setRevokingAll(false);
    }
  }, [sessions, onRevokeAll]);

  const otherCount = otherSessionCount(sessions);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Active Sessions
            </h2>
            <p className="text-xs text-foreground-muted mt-0.5">
              Devices and browsers currently signed in to your account.
            </p>
          </div>

          {!isLoading && !error && otherCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={revokingAll}
              onClick={handleRevokeAll}
              aria-label={`Revoke all ${otherCount} other session${
                otherCount === 1 ? "" : "s"
              }`}
              className="shrink-0 text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/60 disabled:opacity-50"
            >
              {revokingAll ? (
                <>
                  <Loader2
                    size={13}
                    className="animate-spin mr-1"
                    aria-hidden="true"
                  />
                  Revoking…
                </>
              ) : (
                <>
                  <ShieldAlert size={13} className="mr-1" aria-hidden="true" />
                  Revoke all other sessions
                </>
              )}
            </Button>
          )}
        </div>

        {/* Error notice (inline) */}
        {rowError && (
          <p
            role="alert"
            className="mt-2 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400 border border-red-500/20"
          >
            {rowError}
          </p>
        )}
      </CardHeader>

      <CardContent className="px-5 pb-5">
        {/* Loading skeleton */}
        {isLoading && (
          <div aria-busy="true" aria-label="Loading sessions">
            {[1, 2, 3].map((n) => (
              <SessionSkeleton key={n} />
            ))}
          </div>
        )}

        {/* API-level error */}
        {!isLoading && error && (
          <p
            role="alert"
            className="text-sm text-red-400 py-3"
            data-testid="sessions-error"
          >
            {error}
          </p>
        )}

        {/* Empty state */}
        {!isLoading && !error && sessions.length === 0 && (
          <p
            className="text-sm text-foreground-muted py-3"
            data-testid="sessions-empty"
          >
            No active sessions found.
          </p>
        )}

        {/* Session list */}
        {!isLoading && !error && sessions.length > 0 && (
          <ul
            aria-label="Active sessions list"
            role="list"
            data-testid="sessions-list"
          >
            {sessions.map((session) => (
              <li key={session.id} role="listitem">
                <SessionRow
                  session={session}
                  revoking={revokingId === session.id}
                  onRevoke={handleRevoke}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
