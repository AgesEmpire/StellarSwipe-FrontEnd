"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotificationStore } from "@/store/useNotificationStore";
import { EmptyState } from "@/components/ui/empty-state";
import { useFocusReturn } from "@/hooks/useFocusReturn";

export function NotificationBell() {
  const notifications = useNotificationStore((s) => s.notifications);
  const isMarkingAllRead = useNotificationStore((s) => s.isMarkingAllRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const clearAll = useNotificationStore((s) => s.clearAll);
  const unreadCount = useNotificationStore((s) => s.unreadCount());

  const [open, setOpen] = useState(false);

  // Restore focus to the bell button when the panel closes.
  useFocusReturn(open);

  const hasUnread = unreadCount > 0;

  const handleMarkAllAsRead = () => {
    if (!hasUnread || isMarkingAllRead) return;
    // No backend yet — purely local optimistic update.
    markAllAsRead().catch(() => {
      // rollback already handled inside the store; future error UI can hook here
    });
  };

  return (
    <div className="relative">
      <button
        aria-label={
          hasUnread
            ? `${unreadCount} unread notification${
                unreadCount === 1 ? "" : "s"
              }`
            : "Notifications, none unread"
        }
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full hover:bg-accent transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        <AnimatePresence>
          {hasUnread && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
              aria-hidden="true"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              role="dialog"
              aria-label="Notifications"
              className="absolute right-0 z-20 mt-2 w-72 rounded-xl border bg-card shadow-lg overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-2 border-b">
                <span className="text-sm font-semibold">Notifications</span>

                <div className="flex items-center gap-2">
                  {/* Mark all as read — visible only when at least one unread exists */}
                  {hasUnread && (
                    <button
                      onClick={handleMarkAllAsRead}
                      disabled={isMarkingAllRead}
                      aria-label="Mark all notifications as read"
                      className="text-xs text-blue-500 hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isMarkingAllRead ? "Marking…" : "Mark all as read"}
                    </button>
                  )}

                  {notifications.length > 0 && (
                    <button
                      onClick={clearAll}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              <ul className="max-h-64 overflow-y-auto divide-y" role="list">
                {notifications.length === 0 ? (
                  <li className="p-3">
                    <EmptyState
                      title="No notifications"
                      description="You are all caught up. New alerts will appear here."
                      className="rounded-xl bg-transparent py-8"
                      contentClassName="max-w-xs"
                    />
                  </li>
                ) : (
                  notifications.map((n) => (
                    <li key={n.id} className="flex gap-3 px-4 py-3">
                      {!n.read && (
                        <span
                          className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-red-500"
                          aria-hidden="true"
                        />
                      )}
                      <div className={n.read ? "pl-5" : ""}>
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {n.message}
                        </p>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
