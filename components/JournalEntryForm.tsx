"use client";

import { useState } from "react";
import { useTransactionStore } from "@/store/useTransactionStore";
import { journalEntrySchema, type JournalEntry } from "@/lib/journalSchema";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/FormField";
import { Plus } from "lucide-react";
import { toast } from "sonner";

/** Validates a single journal field against the shared zod schema, live. */
function validateField(field: keyof JournalEntry, value: string): string | null {
  const shape = journalEntrySchema.shape as Record<string, { safeParse: (v: unknown) => { success: boolean; error?: { issues: { message: string }[] } } }>;
  const fieldSchema = shape[field as string];
  if (!fieldSchema) return null;
  const result = fieldSchema.safeParse(value);
  if (result.success) return null;
  return result.error?.issues[0]?.message ?? "Invalid value";
}

export function JournalEntryForm() {
  const [isOpen, setIsOpen] = useState(false);
  const addTransaction = useTransactionStore((state) => state.addTransaction);

  const [formData, setFormData] = useState<Partial<JournalEntry>>({
    date: new Date().toISOString().split("T")[0],
    type: "MANUAL",
    status: "SUCCEEDED",
    outcome: "PENDING",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: keyof JournalEntry, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear a stale submit-time error as soon as the user edits the field again.
    setErrors((prev) =>
      prev[field] ? { ...prev, [field]: "" } : prev
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = journalEntrySchema.safeParse({
      ...formData,
      fee: formData.fee || "0",
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    const { data } = result;
    addTransaction({
      id: `tx-manual-${Date.now()}`,
      hash: `manual-${Date.now().toString(16)}`,
      assetPair: data.assetPair,
      amount: data.amount,
      price: data.price,
      fee: data.fee,
      token: data.token,
      timestamp: new Date(data.date).getTime(),
      type: data.type,
      status: data.status,
      outcome: data.outcome,
    });

    toast.success("Transaction added to journal");
    setIsOpen(false);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      type: "MANUAL",
      status: "SUCCEEDED",
      outcome: "PENDING",
    });
    setErrors({});
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        <Plus size={16} /> Add Manual Entry
      </Button>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">New Journal Entry</h3>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <FormField
          label="Date"
          name="date"
          type="date"
          required
          value={formData.date || ""}
          onChange={(v) => updateField("date", v)}
          validate={(v) => validateField("date", v)}
          error={errors.date}
        />

        <FormField
          label="Asset Pair"
          name="assetPair"
          required
          placeholder="e.g. XLM/USDC"
          helperText="Format: BASE/QUOTE"
          value={formData.assetPair || ""}
          onChange={(v) => updateField("assetPair", v)}
          validate={(v) => validateField("assetPair", v)}
          error={errors.assetPair}
        />

        <FormField
          label="Amount"
          name="amount"
          required
          placeholder="0.00"
          value={formData.amount || ""}
          onChange={(v) => updateField("amount", v)}
          validate={(v) => validateField("amount", v)}
          error={errors.amount}
        />

        <FormField
          label="Price"
          name="price"
          required
          placeholder="0.00"
          value={formData.price || ""}
          onChange={(v) => updateField("price", v)}
          validate={(v) => validateField("price", v)}
          error={errors.price}
        />

        <FormField
          label="Token"
          name="token"
          required
          placeholder="e.g. XLM"
          value={formData.token || ""}
          onChange={(v) => updateField("token", v)}
          validate={(v) => validateField("token", v)}
          error={errors.token}
        />

        <FormField
          label="Fee"
          name="fee"
          placeholder="0.00"
          helperText="Leave blank for no fee"
          value={formData.fee || ""}
          onChange={(v) => updateField("fee", v)}
          validate={(v) => (v ? validateField("fee", v) : null)}
          error={errors.fee}
        />

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Status</label>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value as any })
            }
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
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
            onChange={(e) =>
              setFormData({ ...formData, outcome: e.target.value as any })
            }
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="PENDING">Pending</option>
            <option value="WIN">Win</option>
            <option value="LOSS">Loss</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <Button type="submit" className="w-full">
            Save Entry
          </Button>
        </div>
      </form>
    </div>
  );
}
