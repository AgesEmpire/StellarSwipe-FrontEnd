"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Papa from "papaparse";
import { z } from "zod";
import {
  CSV_COLUMNS,
  journalEntrySchema,
  type JournalEntry,
  type CSVColumn,
} from "@/lib/journalSchema";
import { useTransactionStore } from "@/store/useTransactionStore";
import {
  saveCSVImportDraft,
  loadCSVImportDraft,
  clearCSVImportDraft,
  fileMatchesDraft,
  type CSVImportDraft,
} from "@/lib/csvImportDraft";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Step = "upload" | "mapping" | "preview" | "summary";

interface ValidationResult {
  row: Record<string, any>;
  data?: JournalEntry;
  errors?: string[];
  isValid: boolean;
}

export function CSVImportModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<CSVColumn, string>>({} as any);
  const [validationResults, setValidationResults] = useState<
    ValidationResult[]
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState({ imported: 0, skipped: 0 });
  const [resumableDraft, setResumableDraft] = useState<CSVImportDraft | null>(
    null
  );

  const bulkAddTransactions = useTransactionStore(
    (state) => state.bulkAddTransactions
  );

  // Reset in-memory component state only — the persisted draft (if any)
  // survives so the modal can offer to resume next time it's opened.
  const reset = useCallback(() => {
    setStep("upload");
    setFile(null);
    setCsvData([]);
    setHeaders([]);
    setMapping({} as any);
    setValidationResults([]);
    setSummary({ imported: 0, skipped: 0 });
  }, []);

  // Look for a resumable draft each time the modal opens.
  useEffect(() => {
    if (open) {
      setResumableDraft(loadCSVImportDraft());
    }
  }, [open]);

  // Persist mapping/step progress as the user works — never the raw CSV
  // rows or file contents, only metadata needed to relink a re-selected file.
  useEffect(() => {
    if (!file || (step !== "mapping" && step !== "preview")) return;
    const validRows = validationResults.filter((r) => r.isValid).length;
    saveCSVImportDraft({
      fileName: file.name,
      fileSize: file.size,
      fileLastModified: file.lastModified,
      headers,
      mapping,
      step,
      rowCount: csvData.length,
      validSummary:
        step === "preview"
          ? { valid: validRows, invalid: validationResults.length - validRows }
          : undefined,
    });
  }, [file, headers, mapping, step, csvData.length, validationResults]);

  const discardDraft = useCallback(() => {
    clearCSVImportDraft();
    setResumableDraft(null);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    setFile(selectedFile);
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        if (results.meta.fields) {
          setHeaders(results.meta.fields);

          // Resume a saved draft's mapping if this is the same file.
          const draft = resumableDraft;
          const isSameFileAsDraft =
            draft && fileMatchesDraft(selectedFile, draft);

          const newMapping: any = isSameFileAsDraft ? { ...draft!.mapping } : {};
          CSV_COLUMNS.forEach((col) => {
            if (newMapping[col]) return; // keep restored mapping
            const match = results.meta.fields?.find(
              (f) =>
                f.toLowerCase() === col.toLowerCase() ||
                f.toLowerCase().replace(/ /g, "") ===
                  col.toLowerCase().replace(/ /g, "")
            );
            if (match) newMapping[col] = match;
          });
          setMapping(newMapping);
          setStep("mapping");

          if (isSameFileAsDraft) {
            toast.success("Restored your previous import progress");
          }
          setResumableDraft(null);
        }
      },
      error: (err) => {
        toast.error(`Error parsing CSV: ${err.message}`);
      },
    });
  };

  const validateRows = useCallback(async () => {
    setIsProcessing(true);
    const results: ValidationResult[] = [];

    // Process in chunks to keep UI responsive
    const chunkSize = 100;
    for (let i = 0; i < csvData.length; i += chunkSize) {
      const chunk = csvData.slice(i, i + chunkSize);

      const chunkResults = chunk.map((row) => {
        const mappedRow: any = {};
        Object.entries(mapping).forEach(([target, source]) => {
          if (source)
            mappedRow[target.toLowerCase().replace(" ", "")] = row[source];
        });

        // Special handling for date and default values
        const validationData = {
          ...mappedRow,
          type: mappedRow.type || "MANUAL",
          status: mappedRow.status || "SUCCEEDED",
          outcome: mappedRow.outcome || "PENDING",
          fee: mappedRow.fee || "0",
        };

        const parsed = journalEntrySchema.safeParse(validationData);
        return {
          row,
          data: parsed.success ? parsed.data : undefined,
          errors: !parsed.success
            ? parsed.error.issues.map((msg) => msg.message)
            : undefined,
          isValid: parsed.success,
        };
      });

      results.push(...chunkResults);
      // Brief pause for UI thread
      await new Promise((r) => setTimeout(r, 0));
    }

    setValidationResults(results);
    setIsProcessing(false);
    setStep("preview");
  }, [csvData, mapping]);

  const handleImport = () => {
    const validRows = validationResults.filter((r) => r.isValid && r.data);
    const transactions = validRows.map((r) => ({
      id: `tx-csv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      hash: `csv-${Date.now().toString(16)}`,
      assetPair: r.data!.assetPair,
      amount: r.data!.amount,
      price: r.data!.price,
      fee: r.data!.fee,
      token: r.data!.token,
      timestamp: new Date(r.data!.date).getTime(),
      type: r.data!.type,
      status: r.data!.status,
      outcome: r.data!.outcome,
    }));

    bulkAddTransactions(transactions);
    setSummary({
      imported: transactions.length,
      skipped: validationResults.length - transactions.length,
    });
    setStep("summary");
    clearCSVImportDraft();
  };

  const hasUnmappedRequired = useMemo(() => {
    const required: CSVColumn[] = [
      "Date",
      "Asset Pair",
      "Amount",
      "Price",
      "Token",
    ];
    return required.some((col) => !mapping[col]);
  }, [mapping]);

  return (
    <Dialog
      open={open}
      onOpenChange={(val: boolean) => {
        setOpen(val);
        if (!val) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload size={16} /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl sm:max-h-[80vh] overflow-hidden flex flex-col p-0 bg-slate-950 border-white/10 text-white rounded-3xl">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="text-blue-400" />
            Bulk Import CSV
          </DialogTitle>
          {/* Stepper */}
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className={cn(step === "upload" && "text-blue-400")}>
              1. Upload
            </span>
            <ChevronRight size={12} />
            <span className={cn(step === "mapping" && "text-blue-400")}>
              2. Mapping
            </span>
            <ChevronRight size={12} />
            <span className={cn(step === "preview" && "text-blue-400")}>
              3. Preview
            </span>
            <ChevronRight size={12} />
            <span className={cn(step === "summary" && "text-blue-400")}>
              4. Summary
            </span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {step === "upload" && resumableDraft && (
            <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-blue-200">
                  Resume unfinished import: {resumableDraft.fileName}
                </p>
                <p className="text-xs text-blue-300/80">
                  {resumableDraft.rowCount} rows mapped
                  {resumableDraft.validSummary
                    ? ` · ${resumableDraft.validSummary.valid} valid, ${resumableDraft.validSummary.invalid} with errors`
                    : ""}
                  . Re-select the same file to continue.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={discardDraft}
                className="shrink-0 text-blue-200 hover:text-white"
              >
                Discard draft
              </Button>
            </div>
          )}

          {step === "upload" && (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-3xl bg-white/5 p-12 text-center">
              <Upload className="h-12 w-12 text-slate-500 mb-4" />
              <h3 className="text-lg font-medium mb-1">
                Select your trading history file
              </h3>
              <p className="text-sm text-slate-400 mb-6 max-w-sm">
                Upload a .csv file exported from your exchange or tracker.
                We&apos;ll help you map the columns.
              </p>
              <input
                type="file"
                id="csv-upload"
                className="hidden"
                accept=".csv"
                onChange={handleFileUpload}
              />
              <Button asChild>
                <label htmlFor="csv-upload" className="cursor-pointer">
                  Choose File
                </label>
              </Button>
            </div>
          )}

          {step === "mapping" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Match your CSV headers to the corresponding journal fields.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {CSV_COLUMNS.map((col) => (
                  <div key={col} className="space-y-1.5">
                    <label
                      htmlFor={`csv-column-map-${col}`}
                      className="text-xs font-medium text-slate-500 flex items-center justify-between"
                    >
                      {col}
                      {[
                        "Date",
                        "Asset Pair",
                        "Amount",
                        "Price",
                        "Token",
                      ].includes(col) && (
                        <span className="text-red-400 text-[10px] uppercase font-bold">
                          Required
                        </span>
                      )}
                    </label>
                    <select
                      id={`csv-column-map-${col}`}
                      value={mapping[col] || ""}
                      onChange={(e) =>
                        setMapping({ ...mapping, [col]: e.target.value })
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select column...</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  Showing {validationResults.length} rows detected in your file.
                </p>
                <div className="flex gap-4 text-xs">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 size={12} />{" "}
                    {validationResults.filter((r) => r.isValid).length} Valid
                  </span>
                  <span className="flex items-center gap-1 text-red-400">
                    <AlertCircle size={12} />{" "}
                    {validationResults.filter((r) => !r.isValid).length} Error
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900 overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Pair</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {validationResults.slice(0, 50).map((res, i) => (
                      <tr
                        key={i}
                        className={cn(!res.isValid && "bg-red-400/5")}
                      >
                        <td className="px-3 py-2">
                          {res.isValid ? (
                            <CheckCircle2
                              size={14}
                              className="text-emerald-400"
                            />
                          ) : (
                            <div className="group relative">
                              <AlertCircle
                                size={14}
                                className="text-red-400 cursor-help"
                              />
                              <div className="absolute left-6 top-0 hidden group-hover:block z-10 w-48 rounded-lg bg-red-950 p-2 text-[10px] shadow-xl border border-red-400/20">
                                {res.errors?.map((err, j) => (
                                  <p key={j}>• {err}</p>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-300">
                          {res.isValid
                            ? res.data?.date
                            : res.row[mapping["Date"] || ""] || "—"}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {res.isValid
                            ? res.data?.assetPair
                            : res.row[mapping["Asset Pair"] || ""] || "—"}
                        </td>
                        <td className="px-3 py-2">
                          {res.isValid
                            ? res.data?.amount
                            : res.row[mapping["Amount"] || ""] || "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {res.isValid ? (
                            <span className="text-emerald-400 opacity-50">
                              Importing
                            </span>
                          ) : (
                            <span className="text-red-400 opacity-50">
                              Skipping
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {validationResults.length > 50 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-4 text-center text-slate-500"
                        >
                          + {validationResults.length - 50} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === "summary" && (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in-95 duration-500">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Import Complete!</h3>
              <p className="text-slate-400 mb-6 max-w-sm">
                Successfully imported <strong>{summary.imported}</strong>{" "}
                entries.
                {summary.skipped > 0 &&
                  ` ${summary.skipped} rows were skipped due to validation errors.`}
              </p>
              <Button
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
                className="w-full max-w-xs"
              >
                Back to Journal
              </Button>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {step !== "summary" && step !== "upload" && (
          <div className="border-t border-white/10 p-6 flex justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep(step === "mapping" ? "upload" : "mapping")}
              className="gap-2"
            >
              <ChevronLeft size={16} className="rtl-flip" /> Back
            </Button>

            {step === "mapping" && (
              <Button
                onClick={validateRows}
                disabled={hasUnmappedRequired || isProcessing}
                className="gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    Preview <ChevronRight size={16} />
                  </>
                )}
              </Button>
            )}

            {step === "preview" && (
              <Button
                onClick={handleImport}
                disabled={validationResults.every((r) => !r.isValid)}
                className="gap-2 bg-emerald-500 hover:bg-emerald-600"
              >
                Confirm Import <ArrowRight size={16} />
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
