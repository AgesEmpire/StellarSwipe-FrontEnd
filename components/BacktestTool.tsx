"use client";

import React, { useState } from "react";
import {
  runBacktest,
  type BacktestParams,
  type BacktestResult,
} from "@/lib/backtest";
import { Download, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBacktestPresetsStore } from "@/store/useBacktestPresetsStore";

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV(params: BacktestParams, result: BacktestResult) {
  const header = "time,pnl\n";
  const rows = result.trades.map((t) => `${t.time},${t.pnl}`).join("\n");
  const meta = [
    `# from,${params.from}`,
    `# to,${params.to}`,
    `# signals,${params.signals.join("|")}`,
    `# slippageBps,${params.slippageBps ?? 0}`,
    `# feeBps,${params.feeBps ?? 0}`,
    `# totalReturn,${result.totalReturn}`,
    `# winRate,${result.winRate}`,
    `# maxDrawdown,${result.maxDrawdown}`,
  ].join("\n");
  downloadFile(`${meta}\n${header}${rows}`, "backtest-result.csv", "text/csv");
}

function exportJSON(params: BacktestParams, result: BacktestResult) {
  const payload = { inputs: params, results: result };
  downloadFile(
    JSON.stringify(payload, null, 2),
    "backtest-result.json",
    "application/json"
  );
}

export default function BacktestTool() {
  const [from, setFrom] = useState("2023-01-01");
  const [to, setTo] = useState("2023-12-31");
  const [selected, setSelected] = useState<string[]>([]);
  const [slippageBps, setSlippageBps] = useState(10);
  const [feeBps, setFeeBps] = useState(10);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presetName, setPresetName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  const { presets, savePreset, deletePreset } = useBacktestPresetsStore();

  const params: BacktestParams = {
    from,
    to,
    signals: selected,
    slippageBps,
    feeBps,
  };

  async function handleRun() {
    setLoading(true);
    setError(null);
    try {
      const r = await runBacktest(params);
      setResult(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  }

  function handleSavePreset() {
    if (!presetName.trim()) return;
    savePreset(presetName.trim(), params);
    setPresetName("");
    setShowSaveInput(false);
  }

  function handleLoadPreset(id: string) {
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;
    setFrom(preset.params.from);
    setTo(preset.params.to);
    setSelected(preset.params.signals);
    setSlippageBps(preset.params.slippageBps ?? 10);
    setFeeBps(preset.params.feeBps ?? 10);
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      {/* Presets */}
      {presets.length > 0 && (
        <div className="mb-4">
          <label className="text-xs text-foreground-muted block mb-1">
            Load Preset
          </label>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <div key={p.id} className="flex items-center gap-1">
                <button
                  onClick={() => handleLoadPreset(p.id)}
                  className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
                  data-testid={`preset-load-${p.id}`}
                >
                  {p.name}
                </button>
                <button
                  onClick={() => deletePreset(p.id)}
                  aria-label={`Delete preset ${p.name}`}
                  className="text-red-400 hover:text-red-300"
                  data-testid={`preset-delete-${p.id}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inputs */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div>
          <label className="text-xs text-foreground-muted block mb-1">
            From
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="block"
          />
        </div>
        <div>
          <label className="text-xs text-foreground-muted block mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="block"
          />
        </div>
        <div>
          <label className="text-xs text-foreground-muted block mb-1">
            Providers / Signals
          </label>
          <select
            multiple
            value={selected}
            onChange={(e) =>
              setSelected(
                Array.from(e.target.selectedOptions).map((o) => o.value)
              )
            }
            className="block"
          >
            <option value="providerA">Provider A</option>
            <option value="providerB">Provider B</option>
            <option value="signalX">Signal X</option>
            <option value="signalY">Signal Y</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-foreground-muted block mb-1">
            Slippage (bps)
          </label>
          <input
            type="number"
            min={0}
            value={slippageBps}
            onChange={(e) => setSlippageBps(Number(e.target.value))}
            className="block w-20"
          />
        </div>
        <div>
          <label className="text-xs text-foreground-muted block mb-1">
            Fee (bps)
          </label>
          <input
            type="number"
            min={0}
            value={feeBps}
            onChange={(e) => setFeeBps(Number(e.target.value))}
            className="block w-20"
          />
        </div>
      </div>

      {/* Save preset row */}
      <div className="flex items-center gap-2 mb-4">
        {showSaveInput ? (
          <>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name"
              className="text-sm px-2 py-1 bg-white/10 rounded border border-white/20 focus:outline-none"
              data-testid="preset-name-input"
              onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleSavePreset}
              disabled={!presetName.trim()}
              data-testid="preset-save-confirm"
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowSaveInput(false);
                setPresetName("");
              }}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSaveInput(true)}
            className="gap-2"
            data-testid="preset-save-open"
          >
            <Save className="h-3 w-3" />
            Save as preset
          </Button>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-6">
        <Button
          onClick={handleRun}
          disabled={loading}
          className="bg-purple-500 text-white"
        >
          {loading ? "Running…" : "Run Simulation"}
        </Button>
        <Button
          variant="outline"
          disabled={!result}
          onClick={() => result && exportCSV(params, result)}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
        <Button
          variant="outline"
          disabled={!result}
          onClick={() => result && exportJSON(params, result)}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export JSON
        </Button>
      </div>

      {/* Error */}
      {error && <p className="text-red-400 mb-4">{error}</p>}

      {/* Results */}
      {result ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 rounded p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Total Return</p>
              <p className="text-lg font-semibold">
                {(result.totalReturn * 100).toFixed(2)}%
              </p>
            </div>
            <div className="bg-white/5 rounded p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Win Rate</p>
              <p className="text-lg font-semibold">
                {(result.winRate * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-white/5 rounded p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Max Drawdown</p>
              <p className="text-lg font-semibold">
                {(result.maxDrawdown * 100).toFixed(2)}%
              </p>
            </div>
          </div>

          {result.trades.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-gray-400 border-b border-white/10">
                    <th className="pb-2 pr-4">Time</th>
                    <th className="pb-2">PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {result.trades.map((t, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-1 pr-4">{t.time}</td>
                      <td
                        className={`py-1 ${
                          t.pnl >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {t.pnl >= 0 ? "+" : ""}
                        {t.pnl.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        !loading && (
          <p className="text-gray-400">
            Simulated results, win rate, drawdown and trades will appear here
            after running the simulation.
          </p>
        )
      )}
    </div>
  );
}
