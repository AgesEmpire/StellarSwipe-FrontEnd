"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useTransactionStore, type TransactionHistoryItem } from "@/store/useTransactionStore";
import { journalEntrySchema, type JournalEntry } from "@/lib/journalSchema";
import { createJournalEntry, updateJournalEntry } from "@/lib/journalApi";
import { Button } from "@/components/ui/button";
import { ValidationSummary } from "@/components/forms/ValidationSummary";
import { Plus, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

type AutosaveStatus = "idle" | "saving" | "saved" | "offline" | "failed";

interface JournalDraft {
  data: Partial<JournalEntry>;
  savedAt: number;
}

const DRAFT_PREFIX = "journal-draft:";
const AUTOSAVE_DELAY_MS = 800;

function readDraft(key: string): JournalDraft | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw) as JournalDraft;
    return draft && typeof draft === "object" && draft.data ? draft : null;
  } catch {
    return null;
  }
}

function clearDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage unavailable — nothing to clear.
  }
}

const AUTOSAVE_MESSAGES: Record<AutosaveStatus, string> = {
  idle: "",
  saving: "Saving draft…",
  saved: "Draft saved on this device",
  offline: "Offline — edits are kept on this device",
  failed: "Save failed — your edits are still here",
};

interface JournalEntryFormProps {
  /** If provided, the form opens in edit mode for this entry. */
  editEntry?: TransactionHistoryItem | null;
  /** Called after a successful submit (edit mode closes). */
  onEditComplete?: () => void;
  /** Called to close edit mode without saving. */
  onEditCancel?: () => void;
}

// Maps schema field names to their input element ids so the validation
// summary's links can focus the exact field.
const FIELD_IDS: Record<string, string> = {
  date: "journal-entry-date",
  assetPair: "journal-entry-asset-pair",
  amount: "journal-entry-amount",
  price: "journal-entry-price",
  token: "journal-entry-token",
  fee: "journal-entry-fee",
};

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

  // ── Autosave & recovery ────────────────────────────────────────────
  const draftKey = `${DRAFT_PREFIX}${editEntry?.id ?? "new"}`;
  const { isOffline } = useNetworkStatus();
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const [recoverableDraft, setRecoverableDraft] = useState<JournalDraft | null>(null);
  const [draftChecked, setDraftChecked] = useState(false);
  const initialDataRef = useRef<string | null>(null);
  // True once the user has attempted to submit, so the validation summary
  // only appears after a failed submit — never on first render.
  const [submitted, setSubmitted] = useState(false);

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

  // Offer recovery of an interrupted draft whenever the editor opens.
  const editorOpen = isOpen || isEditing;
  useEffect(() => {
    if (!editorOpen) {
      setDraftChecked(false);
      return;
    }
    initialDataRef.current = JSON.stringify(formDataRef.current);
    const draft = readDraft(draftKey);
    setRecoverableDraft(
      draft && JSON.stringify(draft.data) !== initialDataRef.current ? draft : null
    );
    setDraftChecked(true);
  }, [editorOpen, draftKey]);

  const persistDraft = useCallback(() => {
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({ data: formDataRef.current, savedAt: Date.now() })
      );
      setAutosaveStatus(navigator.onLine ? "saved" : "offline");
    } catch {
      setAutosaveStatus("failed");
    }
  }, [draftKey]);

  // Debounced autosave of local edits. Paused until the user has answered
  // the recovery prompt so an old draft is never silently overwritten.
  useEffect(() => {
    if (!editorOpen || !draftChecked || recoverableDraft) return;
    if (JSON.stringify(formData) === initialDataRef.current) return;
    setAutosaveStatus("saving");
    const timer = setTimeout(persistDraft, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [formData, editorOpen, draftChecked, recoverableDraft, persistDraft]);

  useEffect(() => {
    if (isOffline && autosaveStatus === "saved") setAutosaveStatus("offline");
    if (!isOffline && autosaveStatus === "offline") setAutosaveStatus("saved");
  }, [isOffline, autosaveStatus]);

  const restoreDraft = useCallback(() => {
    if (!recoverableDraft) return;
    setFormData(recoverableDraft.data);
    setIsDirty(true);
    setRecoverableDraft(null);
    setAutosaveStatus("saved");
  }, [recoverableDraft]);

  const discardDraft = useCallback(() => {
    clearDraft(draftKey);
    setRecoverableDraft(null);
  }, [draftKey]);

  const resetForm = useCallback(() => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      type: "MANUAL",
      status: "SUCCEEDED",
      outcome: "PENDING",
    });
    setErrors({});
    setSubmitted(false);
    setSubmitError(null);
    setIsDirty(false);
    setAutosaveStatus("idle");
    setRecoverableDraft(null);
    clearDraft(draftKey);
  }, [draftKey]);

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

  /**
   * Updates a single field and clears its inline error immediately, so a
   * message disappears the moment the user starts fixing it (rather than
   * lingering until the next submit attempt).
   */
  const updateField = useCallback((field: keyof JournalEntry, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  /**
   * Validates a single field on blur so required fields surface their
   * errors inline — before the user ever attempts to submit.
   */
  const validateField = useCallback((field: keyof JournalEntry) => {
    const current = {
      ...formDataRef.current,
      fee: formDataRef.current.fee || "0",
    };
    const result = journalEntrySchema.safeParse(current);
    setErrors((prev) => {
      const next = { ...prev };
      const issue = result.success
        ? undefined
        : result.error.issues.find((i) => i.path[0] === field);
      if (issue) {
        next[field] = issue.message;
      } else {
        delete next[field];
      }
      return next;
    });
  }, []);

  /** Summary entries (with element ids) for the ValidationSummary panel. */
  const summaryErrors = useMemo(() => {
    if (!submitted) return [];
    return Object.entries(errors).map(([field, message]) => ({
      field: FIELD_IDS[field] ?? field,
      message,
    }));
  }, [errors, submitted]);

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
        clearDraft(draftKey);
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
        setAutosaveStatus("failed");
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
    [store, draftKey]
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
        clearDraft(draftKey);
        setAutosaveStatus("idle");
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
        setAutosaveStatus("failed");
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
    [store, onEditComplete, draftKey]
  );

  // ── Event handler — guarded so Enter-key and button-click share the same lock
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError(null);
      if (autosaveStatus === "failed") setAutosaveStatus("saving");
      setSubmitted(true);

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
    [validateCurrentForm, isEditing, editEntry, submitEditEntry, submitCreateEntry, resetForm, guard, autosaveStatus]
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

  const handleCancel = isEditing
    ? () => { clearDraft(draftKey); onEditCancel?.(); }
    : () => { setIsOpen(false); resetForm(); };

  // Retry re-submits the current (unchanged) form state, so local edits
  // are never discarded by a failed save.
  const retrySave = () => {
    if (submitError) {
      (document.getElementById("journal-entry-form") as HTMLFormElement | null)?.requestSubmit();
    } else {
      persistDraft();
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 pb-24 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300 sm:pb-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          {isEditing ? "Edit Journal Entry" : "New Journal Entry"}
        </h3>
        <div className="flex items-center gap-2">
          {isEditing && (
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSubmitting}>
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

      <div className="mb-4 flex min-h-6 items-center gap-2 text-xs text-slate-400">
        <span role="status" aria-live="polite" data-testid="journal-autosave-status">
          {AUTOSAVE_MESSAGES[autosaveStatus]}
        </span>
        {autosaveStatus === "failed" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={retrySave}
            disabled={isSubmitting}
            data-testid="journal-autosave-retry"
          >
            Retry save
          </Button>
        )}
      </div>

      {recoverableDraft && (
        <div
          className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300"
          role="region"
          aria-label="Unsaved draft recovery"
          data-testid="journal-draft-recovery"
        >
          <span className="flex-1">
            You have unsaved edits from{" "}
            {new Date(recoverableDraft.savedAt).toLocaleString()}. Restore them?
          </span>
          <Button type="button" size="sm" onClick={restoreDraft}>
            Restore draft
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={discardDraft}>
            Discard
          </Button>
        </div>
      )}

      {submitError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Field-level summary shown only after a failed submit attempt */}
      {submitted && (
        <div className="mb-4">
          <ValidationSummary errors={summaryErrors} />
        </div>
      )}

      {/*
        form onSubmit covers both the submit button click *and* the Enter key
        pressed from any field. useSubmitGuard ensures only one in-flight
        request is sent regardless of which path triggered submission.
      */}
      <form id="journal-entry-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="journal-entry-date" className="text-xs font-medium text-slate-400">Date</label>
          <input
            id="journal-entry-date"
            type="date"
            value={formData.date}
            onChange={(e) => updateField("date", e.target.value)}
            onBlur={() => validateField("date")}
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
            onChange={(e) => updateField("assetPair", e.target.value)}
            onBlur={() => validateField("assetPair")}
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
            onChange={(e) => updateField("amount", e.target.value)}
            onBlur={() => validateField("amount")}
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
            onChange={(e) => updateField("price", e.target.value)}
            onBlur={() => validateField("price")}
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
            onChange={(e) => updateField("token", e.target.value)}
            onBlur={() => validateField("token")}
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
            onChange={(e) => updateField("fee", e.target.value)}
            onBlur={() => validateField("fee")}
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
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
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
            onChange={(e) => setFormData({ ...formData, outcome: e.target.value as any })}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={isSubmitting}
          >
            <option value="PENDING">Pending</option>
            <option value="WIN">Win</option>
            <option value="LOSS">Loss</option>
          </select>
        </div>

        <div className="sm:col-span-2 hidden sm:block">
          <Button
            type="submit"
            className="w-full gap-2"
            {...submitButtonProps}
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {isEditing ? "Save Changes" : "Save Entry"}
          </Button>
        </div>
      </form>

      {/*
        Mobile sticky action bar — on small screens the form can run long
        enough (many fields, on-screen keyboard open) that the inline submit
        button above scrolls out of view. Pin Save/Cancel to the bottom of
        the viewport instead so they're always reachable without covering
        the field the user is editing (the form's own bottom padding above
        reserves space for this bar). `submit`+`form` ties this button to
        the form above without duplicating the submit logic. Only rendered
        while an editable draft (new or edit) is actually open.
      */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-white/10 bg-slate-900/95 px-4 pt-3 backdrop-blur sm:hidden"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <Button
          type="button"
          variant="ghost"
          className="flex-1"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form="journal-entry-form"
          className="flex-1 gap-2"
          {...submitButtonProps}
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {isEditing ? "Save Changes" : "Save Entry"}
        </Button>
      </div>
    </div>
  );
}
