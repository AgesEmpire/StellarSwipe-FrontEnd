"use client";

import { useState } from "react";
import { useTransactionStore } from "@/store/useTransactionStore";
import { journalEntrySchema, type JournalEntry } from "@/lib/journalSchema";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";

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
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.date && (
            <p className="text-[10px] text-red-400">{errors.date}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">
            Asset Pair
          </label>
          <input
            type="text"
            placeholder="e.g. XLM/USDC"
            value={formData.assetPair || ""}
            onChange={(e) =>
              setFormData({ ...formData, assetPair: e.target.value })
            }
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.assetPair && (
            <p className="text-[10px] text-red-400">{errors.assetPair}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Amount</label>
          <input
            type="text"
            placeholder="0.00"
            value={formData.amount || ""}
            onChange={(e) =>
              setFormData({ ...formData, amount: e.target.value })
            }
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.amount && (
            <p className="text-[10px] text-red-400">{errors.amount}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Price</label>
          <input
            type="text"
            placeholder="0.00"
            value={formData.price || ""}
            onChange={(e) =>
              setFormData({ ...formData, price: e.target.value })
            }
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.price && (
            <p className="text-[10px] text-red-400">{errors.price}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Token</label>
          <input
            type="text"
            placeholder="e.g. XLM"
            value={formData.token || ""}
            onChange={(e) =>
              setFormData({ ...formData, token: e.target.value })
            }
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.token && (
            <p className="text-[10px] text-red-400">{errors.token}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Fee</label>
          <input
            type="text"
            placeholder="0.00"
            value={formData.fee || ""}
            onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.fee && (
            <p className="text-[10px] text-red-400">{errors.fee}</p>
          )}
        </div>

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
