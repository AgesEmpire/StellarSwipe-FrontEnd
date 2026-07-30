"use client";

import { useState, useCallback, useRef } from "react";
import { useTransactionStore, type TransactionHistoryItem } from "@/store/useTransactionStore";
import { journalEntrySchema, type JournalEntry } from "@/lib/journalSchema";
import { createJournalEntry, updateJournalEntry } from "@/lib/journalApi";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";

interface JournalEntryFormProps {
  /** If provided, the form opens in edit mode for this entry. */
  editEntry?: TransactionHistoryItem | null;
  /** Called after a successful submit (edit mode closes). */
  onEditComplete?: () => void;
  /** Called to close edit mode without saving. */
  onEditCancel?: () => void;
}

export function JournalEntryForm({
  editEntry,
  onEditComplete,
  onEditCancel,
}: JournalEntryFormProps) {
  const store = useTransactionStore;
  const isEditing = !!editEntry;

  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<JournalEntry>>({
    date: editEntry
      ? new Date(editEntry.timestamp).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    assetPair: editEntry?.assetPair || "",
    amount: editEntry?.amount || "",
    price: editEntry?.price || "",
    token: editEntry?.token || "",
    fee: editEntry?.fee || "",
    type: (editEntry?.type as JournalEntry["type"]) || "MANUAL",
    status: (editEntry?.status as JournalEntry["status"]) || "SUCCEEDED",
    outcome: (editEntry?.outcome as JournalEntry["outcome"]) || "PENDING",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Ref to capture the latest formData so async retry callbacks always
  // read the current state — avoids stale closures.
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  const resetForm = useCallback(() => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      type: "MANUAL",
      status: "SUCCEEDED",
      outcome: "PENDING",
    });
    setErrors({});
    setSubmitError(null);
  }, []);

  // ------------------------------------------------------------------
  // Core submission logic (extracted so retry does not reuse events)
  // ------------------------------------------------------------------

  const validateCurrentForm = useCallback(() => {
    const current = formDataRef.current;
    const result = journalEntrySchema.safeParse({
      ...current,
      fee: current.fee || "0",
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return null;
    }

    setErrors({});
    return result.data;
  }, []);

  /** Optimistic create: add entry locally → call API → replace id or rollback. */
  const submitCreateEntry = useCallback(
    async (data: JournalEntry) => {
      const tempId = `tx-optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      const optimisticEntry: TransactionHistoryItem = {
        id: tempId,
        hash: `manual-${Date.now().toString(16)}`,
        assetPair: data.assetPair,
        amount: data.amount,
        price: data.price,
        fee: data.fee,
        token: data.token,
        timestamp: new Date(data.date).getTime(),
        type: data.type as TransactionHistoryItem["type"],
        status: data.status as TransactionHistoryItem["status"],
        outcome: data.outcome as TransactionHistoryItem["outcome"],
      };

      // Optimistic: show entry immediately
      store.getState().addTransaction(optimisticEntry);
      store.getState().markPending(tempId);

      try {
        const serverEntry = await createJournalEntry(optimisticEntry);
        store.getState().removeTransaction(tempId);
        store.getState().addTransaction(serverEntry);
        store.getState().clearPending(tempId);
        toast.success("Transaction added to journal", {
          description: `${data.assetPair} — ${data.amount} ${data.token}`,
          duration: 2500,
        });
      } catch (err) {
        store.getState().removeTransaction(tempId);
        store.getState().markFailed(tempId);
        const message =
          err instanceof Error ? err.message : "Failed to save entry.";
        setSubmitError(message);
        toast.error("Save failed", {
          description: message,
          duration: 4000,
          action: {
            label: "Retry",
            onClick: () => {
              store.getState().clearFailed(tempId);
              submitCreateEntry(data);
            },
          },
        });
      }
    },
    [store]
  );

  /** Optimistic edit: update locally → call API → rollback on failure. */
  const submitEditEntry = useCallback(
    async (data: JournalEntry, entry: TransactionHistoryItem) => {
      const patch: Partial<TransactionHistoryItem> = {
        assetPair: data.assetPair,
        amount: data.amount,
        price: data.price,
        fee: data.fee,
        token: data.token,
        type: data.type as TransactionHistoryItem["type"],
        status: data.status as TransactionHistoryItem["status"],
        outcome: data.outcome as TransactionHistoryItem["outcome"],
      };

      const snapshot = { ...entry };

      store.getState().updateTransaction(entry.id, patch);
      store.getState().markPending(entry.id);

      try {
        await updateJournalEntry(entry.id, patch);
        store.getState().clearPending(entry.id);
        toast.success("Journal entry updated", {
          description: `${data.assetPair} — changes saved.`,
          duration: 2500,
        });
        onEditComplete?.();
      } catch (err) {
        store.getState().updateTransaction(entry.id, snapshot);
        store.getState().markFailed(entry.id);
        const message =
          err instanceof Error ? err.message : "Failed to save changes.";
        setSubmitError(message);
        toast.error("Update failed", {
          description: message,
          duration: 4000,
          action: {
            label: "Retry",
            onClick: () => {
              store.getState().clearFailed(entry.id);
              submitEditEntry(data, entry);
            },
          },
        });
      }
    },
    [store, onEditComplete]
  );

  // ── Event handler (thin wrapper that validates and delegates) ──────────

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError(null);

      const data = validateCurrentForm();
      if (!data) return;

      setSubmitting(true);
      setSubmitError(null);

      try {
        if (isEditing && editEntry) {
          await submitEditEntry(data, editEntry);
        } else {
          await submitCreateEntry(data);
        }
      } finally {
        setSubmitting(false);
        if (!isEditing) {
          setIsOpen(false);
          resetForm();
        }
      }
    },
    [validateCurrentForm, isEditing, editEntry, submitEditEntry, submitCreateEntry, resetForm]
  );

  // ── Render ──────────────────────────────────────────────────────────

  if (!isOpen && !isEditing) {
    return (
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        <Plus size={16} /> Add Manual Entry
      </Button>
    );
  }

  const showForm = isOpen || isEditing;
  if (!showForm) return null;

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          {isEditing ? "Edit Journal Entry" : "New Journal Entry"}
        </h3>
        <div className="flex items-center gap-2">
          {isEditing && (
            <Button variant="ghost" size="sm" onClick={onEditCancel} disabled={submitting}>
              Cancel
            </Button>
          )}
          {!isEditing && (
            <Button variant="ghost" size="sm" onClick={() => { setIsOpen(false); resetForm(); }}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {submitError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={submitting}
          />
          {errors.date && <p className="text-[10px] text-red-400">{errors.date}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Asset Pair</label>
          <input
            type="text"
            placeholder="e.g. XLM/USDC"
            value={formData.assetPair || ""}
            onChange={(e) => setFormData({ ...formData, assetPair: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={submitting}
          />
          {errors.assetPair && <p className="text-[10px] text-red-400">{errors.assetPair}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Amount</label>
          <input
            type="text"
            placeholder="0.00"
            value={formData.amount || ""}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={submitting}
          />
          {errors.amount && <p className="text-[10px] text-red-400">{errors.amount}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Price</label>
          <input
            type="text"
            placeholder="0.00"
            value={formData.price || ""}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={submitting}
          />
          {errors.price && <p className="text-[10px] text-red-400">{errors.price}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Token</label>
          <input
            type="text"
            placeholder="e.g. XLM"
            value={formData.token || ""}
            onChange={(e) => setFormData({ ...formData, token: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={submitting}
          />
          {errors.token && <p className="text-[10px] text-red-400">{errors.token}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Fee</label>
          <input
            type="text"
            placeholder="0.00"
            value={formData.fee || ""}
            onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={submitting}
          />
          {errors.fee && <p className="text-[10px] text-red-400">{errors.fee}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={submitting}
          >
            <option value="PENDING">Pending</option>
            <option value="SUCCEEDED">Succeeded</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Outcome</label>
          <select
            value={formData.outcome}
            onChange={(e) => setFormData({ ...formData, outcome: e.target.value as any })}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={submitting}
          >
            <option value="PENDING">Pending</option>
            <option value="WIN">Win</option>
            <option value="LOSS">Loss</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <Button type="submit" className="w-full gap-2" disabled={submitting}>
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {isEditing ? "Save Changes" : "Save Entry"}
          </Button>
        </div>
      </form>
    </div>
  );
}
