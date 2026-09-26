"use client"

import Link from "next/link"
import { useBacktestHistoryStore } from "@/store/useBacktestHistoryStore"
import { Button } from "@/components/ui/button"

export default function BacktestHistoryPage() {
  const { runs, clearHistory } = useBacktestHistoryStore()

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Backtest Run History</h1>
        <div className="flex gap-2">
          {runs.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearHistory}>
              Clear History
            </Button>
          )}
          <Link href="/backtest-sim">
            <Button size="sm">New Run</Button>
          </Link>
        </div>
      </div>

      {runs.length === 0 ? (
        <p className="text-gray-400">No backtest runs yet. Run a simulation to see history here.</p>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => (
            <Link
              key={run.id}
              href={`/backtest-sim/history/${run.id}`}
              className="block bg-surface border border-border rounded-lg p-4 hover:bg-white/5 transition-colors"
              data-testid={`history-run-${run.id}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {run.params.from} → {run.params.to}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Signals: {run.params.signals.length > 0 ? run.params.signals.join(", ") : "none"} ·{" "}
                    {new Date(run.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-4 text-sm text-right">
                  <div>
                    <p className="text-xs text-gray-400">Return</p>
                    <p className={run.result.totalReturn >= 0 ? "text-green-400" : "text-red-400"}>
                      {(run.result.totalReturn * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Win Rate</p>
                    <p>{(run.result.winRate * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Drawdown</p>
                    <p className="text-red-400">{(run.result.maxDrawdown * 100).toFixed(2)}%</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
