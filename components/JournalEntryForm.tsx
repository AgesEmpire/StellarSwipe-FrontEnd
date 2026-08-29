"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import type { z } from "zod";
import { useTransactionStore, type TransactionHistoryItem } from "@/store/useTransactionStore";
import { journalEntrySchema, type JournalEntry } from "@/lib/journalSchema";
import { createJournalEntry, updateJournalEntry } from "@/lib/journalApi";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

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

  // Tracks which fields the user has interacted with. Errors surface for a
  // field once it is blurred (or on change once it is already touched), so
  // required fields get inline feedback *before* the user hits submit.
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback(
    (field: string, value: string): string | undefined => {
      const shape = journalEntrySchema.shape as Record<string, z.ZodTypeAny>;
      const result = shape[field]?.safeParse(value);
      if (!result || result.success) return undefined;
      return result.error.issues[0]?.message;
    },
    []
  );

  // Live re-validation: once a field is touched (or already shows an error),
  // typing clears/fixes the message immediately instead of waiting for submit.
  const handleFieldChange = useCallback(
    (field: string, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (touched[field] || errors[field]) {
        const message = validateField(field, value);
        setErrors((prev) => {
          const next = { ...prev };
          if (message) next[field] = message;
          else delete next[field];
          return next;
        });
      }
    },
    [touched, errors, validateField]
  );

  const handleFieldBlur = useCallback(
    (field: string, value: string) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const message = validateField(field, value);
      setErrors((prev) => {
        const next = { ...prev };
        if (message) next[field] = message;
        else delete next[field];
        return next;
      });
    },
    [validateField]
  );

  const markAllTouched = useCallback(() => {
    const all = Object.keys(journalEntrySchema.shape).reduce<Record<string, boolean>>(
      (acc, field) => ({ ...acc, [field]: true }),
      {}
    );
    setTouched(all);
  }, []);

  // Submit guard: prevents duplicate submissions on both click and Enter paths
  const { isSubmitting, guard, submitButtonProps } = useSubmitGuard();

  // Ref to capture the latest formData so async retry callbacks always
  // read the current state — avoids stale closures.
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  // ── Dirty tracking ─────────────────────────────────────────────────
  // The form is "dirty" once the user makes any meaningful edit. We track
  // this with a simple flag rather than deep-comparing the full form state,
  // which avoids edge cases around default values.
  const [isDirty, setIsDirty] = useState(false);

  const markDirty = useCallback(() => {
    if (!isDirty) setIsDirty(true);
  }, [isDirty]);

  // ── Unsaved-changes protection ─────────────────────────────────────
  const { markSaved, confirmNavigation } = useUnsavedChanges({
    isDirty: isDirty && (isOpen || isEditing),
    message: "Your journal entry has unsaved changes. Leave anyway?",
  });

  const resetForm = useCallback(() => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      type: "MANUAL",
      status: "SUCCEEDED",
      outcome: "PENDING",
    });
    setErrors({});
    setSubmitError(null);
    setTouched({});
    setIsDirty(false);
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
        throw err; // re-throw so guard can record the failure
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
        throw err; // re-throw so guard can record the failure
      }
    },
    [store, onEditComplete]
  );

  // ── Event handler — guarded so Enter-key and button-click share the same lock
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError(null);

      // Surface inline errors for every field on submit, not just the ones
      // the user already blurred.
      markAllTouched();
      const data = validateCurrentForm();
      if (!data) return;

      await guard(async () => {
        if (isEditing && editEntry) {
          await submitEditEntry(data, editEntry);
        } else {
          await submitCreateEntry(data);
          setIsOpen(false);
          resetForm();
        }
      });
    },
    [validateCurrentForm, isEditing, editEntry, submitEditEntry, submitCreateEntry, resetForm, guard, markAllTouched]
  );

  // ── Render ──────────────────────────────────────────────────────────

  // "Ready to save" sense: once any field has been interacted with, give
  // immediate feedback on whether the current state is valid or still needs
  // attention — before the user attempts a submit.
  const isFormValid = useMemo(
    () =>
      journalEntrySchema
        .safeParse({ ...formData, fee: formData.fee || "0" })
        .success,
    [formData]
  );
  const hasTouchedAny = useMemo(
    () => Object.keys(touched).length > 0,
    [touched]
  );

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
            <Button variant="ghost" size="sm" onClick={onEditCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          {!isEditing && (
            <Button variant="ghost" size="sm" onClick={() => { setIsOpen(false); resetForm(); }} disabled={isSubmitting}>
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

      {/*
        form onSubmit covers both the submit button click *and* the Enter key
        pressed from any field. useSubmitGuard ensures only one in-flight
        request is sent regardless of which path triggered submission.
      */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="journal-entry-date" className="text-xs font-medium text-slate-400">Date</label>
          <input
            id="journal-entry-date"
            type="date"
            value={formData.date}
            onChange={(e) => handleFieldChange("date", e.target.value)}
            onBlur={(e) => handleFieldBlur("date", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={isSubmitting}
            aria-invalid={!!errors.date}
            aria-describedby={errors.date ? "journal-entry-date-error" : undefined}
          />
          {errors.date && <p id="journal-entry-date-error" className="text-[10px] text-red-400">{errors.date}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="journal-entry-asset-pair" className="text-xs font-medium text-slate-400">Asset Pair</label>
          <input
            id="journal-entry-asset-pair"
            type="text"
            placeholder="e.g. XLM/USDC"
            value={formData.assetPair || ""}
            onChange={(e) => handleFieldChange("assetPair", e.target.value)}
            onBlur={(e) => handleFieldBlur("assetPair", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={isSubmitting}
            aria-invalid={!!errors.assetPair}
            aria-describedby={errors.assetPair ? "journal-entry-asset-pair-error" : undefined}
          />
          {errors.assetPair && <p id="journal-entry-asset-pair-error" className="text-[10px] text-red-400">{errors.assetPair}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="journal-entry-amount" className="text-xs font-medium text-slate-400">Amount</label>
          <input
            id="journal-entry-amount"
            type="text"
            placeholder="0.00"
            value={formData.amount || ""}
            onChange={(e) => handleFieldChange("amount", e.target.value)}
            onBlur={(e) => handleFieldBlur("amount", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={isSubmitting}
            aria-invalid={!!errors.amount}
            aria-describedby={errors.amount ? "journal-entry-amount-error" : undefined}
          />
          {errors.amount && <p id="journal-entry-amount-error" className="text-[10px] text-red-400">{errors.amount}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="journal-entry-price" className="text-xs font-medium text-slate-400">Price</label>
          <input
            id="journal-entry-price"
            type="text"
            placeholder="0.00"
            value={formData.price || ""}
            onChange={(e) => handleFieldChange("price", e.target.value)}
            onBlur={(e) => handleFieldBlur("price", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={isSubmitting}
            aria-invalid={!!errors.price}
            aria-describedby={errors.price ? "journal-entry-price-error" : undefined}
          />
          {errors.price && <p id="journal-entry-price-error" className="text-[10px] text-red-400">{errors.price}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="journal-entry-token" className="text-xs font-medium text-slate-400">Token</label>
          <input
            id="journal-entry-token"
            type="text"
            placeholder="e.g. XLM"
            value={formData.token || ""}
            onChange={(e) => handleFieldChange("token", e.target.value)}
            onBlur={(e) => handleFieldBlur("token", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={isSubmitting}
            aria-invalid={!!errors.token}
            aria-describedby={errors.token ? "journal-entry-token-error" : undefined}
          />
          {errors.token && <p id="journal-entry-token-error" className="text-[10px] text-red-400">{errors.token}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="journal-entry-fee" className="text-xs font-medium text-slate-400">Fee</label>
          <input
            id="journal-entry-fee"
            type="text"
            placeholder="0.00"
            value={formData.fee || ""}
            onChange={(e) => handleFieldChange("fee", e.target.value)}
            onBlur={(e) => handleFieldBlur("fee", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={isSubmitting}
            aria-invalid={!!errors.fee}
            aria-describedby={errors.fee ? "journal-entry-fee-error" : undefined}
          />
          {errors.fee && <p id="journal-entry-fee-error" className="text-[10px] text-red-400">{errors.fee}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="journal-entry-status" className="text-xs font-medium text-slate-400">Status</label>
          <select
            id="journal-entry-status"
            value={formData.status}
            onChange={(e) => handleFieldChange("status", e.target.value)}
            onBlur={(e) => handleFieldBlur("status", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={isSubmitting}
          >
            <option value="PENDING">Pending</option>
            <option value="SUCCEEDED">Succeeded</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="journal-entry-outcome" className="text-xs font-medium text-slate-400">Outcome</label>
          <select
            id="journal-entry-outcome"
            value={formData.outcome}
            onChange={(e) => handleFieldChange("outcome", e.target.value)}
            onBlur={(e) => handleFieldBlur("outcome", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={isSubmitting}
          >
            <option value="PENDING">Pending</option>
            <option value="WIN">Win</option>
            <option value="LOSS">Loss</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <Button
            type="submit"
            className="w-full gap-2"
            {...submitButtonProps}
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {isEditing ? "Save Changes" : "Save Entry"}
          </Button>
          {hasTouchedAny && (
            <p
              role="status"
              className={`mt-2 text-center text-xs ${
                isFormValid ? "text-emerald-400" : "text-slate-400"
              }`}
            >
              {isFormValid
                ? "Looks good — ready to save."
                : "Fix the highlighted fields to save."}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
