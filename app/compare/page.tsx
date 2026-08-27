"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Printer,
  GitCompare,
  Link as LinkIcon,
  Check,
  Download,
  Image as ImageIcon,
  AlertCircle,
  X as XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PageTransition } from "@/components/PageTransition";
import { useComparisonStore } from "@/store/useComparisonStore";
import { MetricToggleBar } from "@/components/comparison/MetricToggleBar";
import { fetchSignals } from "@/lib/api";
import { ComparisonErrorBoundary } from "@/components/ComparisonErrorBoundary";
import {
  downloadComparisonCsv,
  downloadComparisonImage,
} from "@/lib/exportComparison";
import { ExportPreviewDialog } from "@/components/ExportPreviewDialog";
import { toast } from "@/lib/toast";

const ComparisonCard = dynamic(
  () =>
    import("@/components/comparison/ComparisonCard").then(
      (m) => m.ComparisonCard
    ),
  {
    loading: () => <div className="animate-pulse h-48 bg-white/5 rounded-xl" />,
    ssr: false,
  }
);
const ComparisonChart = dynamic(
  () =>
    import("@/components/comparison/ComparisonChart").then(
      (m) => m.ComparisonChart
    ),
  {
    loading: () => <div className="animate-pulse h-32 bg-white/5 rounded-xl" />,
    ssr: false,
  }
);
const AddSignalPanel = dynamic(
  () =>
    import("@/components/comparison/AddSignalPanel").then(
      (m) => m.AddSignalPanel
    ),
  {
    loading: () => <div className="animate-pulse h-20 bg-white/5 rounded" />,
    ssr: false,
  }
);

function computeBestValues(
  signals: ReturnType<typeof useComparisonStore.getState>["signals"]
): Record<string, number> {
  const best: Record<string, number> = {};

  const update = (
    key: string,
    val: number | undefined,
    higherIsBetter: boolean
  ) => {
    if (val == null || isNaN(val)) return;
    if (best[key] == null) {
      best[key] = val;
      return;
    }
    if (higherIsBetter ? val > best[key] : val < best[key]) best[key] = val;
  };

  for (const s of signals) {
    update("confidence", s.confidence, true);
    update("entryPrice", undefined, false);
    update("targetPrice", undefined, true);
    update("stopLoss", undefined, false);
    const rr = undefined;
    update("riskReward", rr, true);
  }

  return best;
}

function ComparePageContent() {
  const {
    signals,
    removeSignal,
    clearSignals,
    hiddenMetrics,
    toggleMetric,
    canAdd,
    addSignal,
    limitReached,
    dismissLimitMessage,
  } = useComparisonStore();
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportingImage, setExportingImage] = useState(false);
  const [pendingExport, setPendingExport] = useState<
    "csv" | "image" | "pdf" | null
  >(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // On mount: restore comparison from URL ?ids=a,b,c
  useEffect(() => {
    const ids = searchParams.get("ids");
    if (!ids || signals.length > 0) return;
    const idList = ids.split(",").filter(Boolean).slice(0, 3);

    // Guard against writing to the (global) comparison store after this
    // view has been navigated away from — a late response for an
    // abandoned /compare visit must not silently populate the store for
    // whatever page the user has since navigated to.
    let cancelled = false;
    const controller = new AbortController();
    fetchSignals({ signal: controller.signal })
      .then((all) => {
        if (cancelled) return;
        for (const id of idList) {
          const found = all.items.find((s) => s.id === id);
          if (found) addSignal(found);
        }
      })
      .catch(() => {
        // gracefully ignore — signal may no longer exist, or the request
        // was cancelled because this view was abandoned
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep URL in sync with current selection
  useEffect(() => {
    const ids = signals.map((s) => s.id).join(",");
    const params = ids ? `?ids=${ids}` : "";
    router.replace(`/compare${params}`, { scroll: false });
  }, [signals, router]);

  const handleCopyShareLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Share link copied", {
        description: "Anyone with this link will see the same comparison.",
        duration: 2500,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy link", {
        description: "Your browser blocked clipboard access. Copy the URL from the address bar instead.",
        duration: 4000,
      });
    }
  };

  const bestValues = computeBestValues(signals);

  const tickerSummary = signals.map((s) => s.ticker).join(", ");

  const exportPreviewConfig: Record<
    "csv" | "image" | "pdf",
    {
      title: string;
      description: string;
      confirmLabel: string;
      items: { label: string; value: string }[];
    }
  > = {
    csv: {
      title: "Export comparison as CSV",
      description:
        "A spreadsheet with one row per signal will download to your device.",
      confirmLabel: "Download CSV",
      items: [
        { label: "Format", value: "CSV (.csv)" },
        { label: "Signals included", value: tickerSummary || "—" },
        { label: "Filename", value: "signal-comparison.csv" },
      ],
    },
    image: {
      title: "Export comparison as image",
      description:
        "A PNG snapshot of the current comparison table will download to your device.",
      confirmLabel: "Download image",
      items: [
        { label: "Format", value: "PNG image" },
        { label: "Signals included", value: tickerSummary || "—" },
        { label: "Filename", value: "signal-comparison.png" },
      ],
    },
    pdf: {
      title: "Export comparison as PDF",
      description:
        "Your browser's print dialog will open — choose \"Save as PDF\" to export.",
      confirmLabel: "Open print dialog",
      items: [
        { label: "Format", value: "PDF (via print)" },
        { label: "Signals included", value: tickerSummary || "—" },
      ],
    },
  };

  const handleExportPDF = () => setPendingExport("pdf");
  const handleExportCsv = () => setPendingExport("csv");
  const handleExportImage = () => setPendingExport("image");

  const runPendingExport = async () => {
    if (pendingExport === "csv") {
      downloadComparisonCsv(signals);
      toast.success("CSV downloaded", {
        description: `${signals.length} signal${signals.length === 1 ? "" : "s"} exported.`,
      });
      return;
    }

    if (pendingExport === "image") {
      if (!tableRef.current) {
        throw new Error("Nothing to capture — the comparison table isn't visible.");
      }
      setExportingImage(true);
      try {
        await downloadComparisonImage(tableRef.current);
        toast.success("Image downloaded", {
          description: "A PNG snapshot was saved to your device.",
        });
      } finally {
        setExportingImage(false);
      }
      return;
    }

    if (pendingExport === "pdf") {
      window.print();
    }
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-gray-950 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <GitCompare
                className="h-6 w-6 text-blue-400"
                aria-hidden="true"
              />
              <div>
                <h1 className="text-2xl font-bold">Signal Comparison</h1>
                <p className="text-sm text-gray-400">
                  Compare up to 3 signals side-by-side
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              {signals.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyShareLink}
                    className="gap-2"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <LinkIcon className="h-4 w-4" />
                    )}
                    {copied ? "Copied!" : "Share Link"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportPDF}
                    className="gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Export PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCsv}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportImage}
                    disabled={exportingImage}
                    className="gap-2"
                  >
                    <ImageIcon className="h-4 w-4" />
                    {exportingImage ? "Capturing…" : "Export Image"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSignals}
                    className="gap-2 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear All
                  </Button>
                </>
              )}
              {canAdd() && (
                <Button
                  size="sm"
                  onClick={() => setAddPanelOpen((v) => !v)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Signal
                </Button>
              )}
            </div>
          </div>

          {/* Add signal panel — inline on tablet/desktop */}
          <AnimatePresence>
            {addPanelOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="hidden overflow-hidden mb-6 sm:block"
              >
                <div className="rounded-xl border border-white/10 bg-gray-900 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-300">
                      Select signals to compare
                    </h2>
                    <span className="text-xs text-gray-500">
                      {signals.length}/3 selected
                    </span>
                  </div>
                  <AddSignalPanel />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Add signal panel — bottom sheet on mobile */}
          <BottomSheet
            open={addPanelOpen}
            onClose={() => setAddPanelOpen(false)}
            ariaLabel="Select signals to compare"
            className="sm:hidden"
            title="Select signals to compare"
            headerExtra={
              <span className="text-xs text-gray-500">
                {signals.length}/3 selected
              </span>
            }
          >
            <div className="px-4 pb-6">
              <AddSignalPanel />
            </div>
          </BottomSheet>

          {/* Limit-reached banner */}
          <AnimatePresence>
            {limitReached && (
              <motion.div
                key="limit-banner"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                role="alert"
                aria-live="polite"
                className="flex items-center justify-between gap-3 mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 print:hidden"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    You can compare up to {3} signals at once. Remove one to add
                    another.
                  </span>
                </div>
                <button
                  onClick={dismissLimitMessage}
                  aria-label="Dismiss"
                  className="shrink-0 rounded p-0.5 hover:bg-amber-500/20 transition-colors"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {signals.length === 0 ? (
            <EmptyState
              className="py-24"
              icon={<GitCompare className="h-8 w-8 text-sky-400/80" />}
              title="No signals selected"
              description="Add up to 3 signals to compare their metrics, entry/exit points, and performance side-by-side."
              action={
                <Button onClick={() => setAddPanelOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Your First Signal
                </Button>
              }
            />
          ) : (
            <ComparisonErrorBoundary>
              {/* Metric toggles */}
              <div className="mb-6 print:hidden">
                <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">
                  Toggle Columns
                </p>
                <MetricToggleBar
                  hiddenMetrics={hiddenMetrics}
                  onToggle={toggleMetric}
                />
              </div>

              {/* Side-by-side cards — horizontal scroll on mobile */}
              <div
                ref={tableRef}
                className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0"
              >
                <div
                  className="flex gap-4"
                  style={{ minWidth: `${signals.length * 220}px` }}
                >
                  {signals.map((signal) => (
                    <motion.div
                      key={signal.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex-1"
                      style={{ minWidth: 200 }}
                    >
                      <ComparisonCard
                        signal={signal}
                        onRemove={() => removeSignal(signal.id)}
                        hiddenMetrics={hiddenMetrics}
                        bestValues={bestValues}
                      />
                    </motion.div>
                  ))}

                  {/* Placeholder slot when fewer than 3 */}
                  {canAdd() && (
                    <div
                      className="flex-1 flex items-center justify-center rounded-xl border-2 border-dashed border-white/10 min-h-[200px] cursor-pointer hover:border-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 print:hidden"
                      style={{ minWidth: 200 }}
                      onClick={() => setAddPanelOpen(true)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setAddPanelOpen(true);
                        }
                      }}
                      aria-label="Add another signal"
                    >
                      <div className="text-center text-gray-400">
                        <Plus className="h-8 w-8 mx-auto mb-2" aria-hidden="true" />
                        <p className="text-sm">Add signal</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Performance chart */}
              {signals.length >= 2 && (
                <div className="mt-8 rounded-xl border border-white/10 bg-gray-900 p-6">
                  <h2 className="text-sm font-semibold text-gray-300 mb-5">
                    Performance Comparison
                  </h2>
                  <ComparisonChart signals={signals} />
                </div>
              )}
            </ComparisonErrorBoundary>
          )}
        </div>
      </main>

      {/* Export preview & confirmation dialog */}
      {pendingExport && (
        <ExportPreviewDialog
          open={pendingExport !== null}
          onOpenChange={(open) => {
            if (!open) setPendingExport(null);
          }}
          title={exportPreviewConfig[pendingExport].title}
          description={exportPreviewConfig[pendingExport].description}
          items={exportPreviewConfig[pendingExport].items}
          confirmLabel={exportPreviewConfig[pendingExport].confirmLabel}
          onConfirm={runPendingExport}
        />
      )}

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          body {
            background: white;
            color: black;
          }
          .bg-gray-950,
          .bg-gray-900 {
            background: #f9fafb !important;
          }
          .text-white {
            color: #111 !important;
          }
          .border-white\\/10 {
            border-color: #e5e7eb !important;
          }
        }
      `}</style>
    </PageTransition>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={null}>
      <ComparePageContent />
    </Suspense>
  );
}
