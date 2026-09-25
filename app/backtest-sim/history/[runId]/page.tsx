"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { useBacktestHistoryStore } from "@/store/useBacktestHistoryStore"
import { Button } from "@/components/ui/button"

export default function BacktestRunDetailPage() {
  const { runId } = useParams<{ runId: string }>()
  const run = useBacktestHistoryStore((s) => s.getRun(runId))

  if (!run) {
    return (
      <div className="p-6">
        <p className="text-gray-400 mb-4">Run not found.</p>
        <Link href="/backtest-sim/history">
          <Button variant="outline" size="sm">← Back to History</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/backtest-sim/history">
          <Button variant="outline" size="sm">← History</Button>
        </Link>
        <h1 className="text-2xl font-bold">
          {run.params.from} → {run.params.to}
        </h1>
      </div>

      <p className="text-xs text-gray-400 mb-6">{new Date(run.timestamp).toLocaleString()}</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 rounded p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">Total Return</p>
          <p className="text-lg font-semibold">{(run.result.totalReturn * 100).toFixed(2)}%</p>
        </div>
        <div className="bg-white/5 rounded p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">Win Rate</p>
          <p className="text-lg font-semibold">{(run.result.winRate * 100).toFixed(1)}%</p>
        </div>
        <div className="bg-white/5 rounded p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">Max Drawdown</p>
          <p className="text-lg font-semibold">{(run.result.maxDrawdown * 100).toFixed(2)}%</p>
        </div>
      </div>

      <div className="mb-4 text-sm text-gray-400 space-y-1">
        <p>Signals: {run.params.signals.length > 0 ? run.params.signals.join(", ") : "none"}</p>
        <p>Slippage: {run.params.slippageBps ?? 0} bps · Fee: {run.params.feeBps ?? 0} bps</p>
      </div>

      {run.result.trades.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-400 border-b border-white/10">
                <th className="pb-2 pr-4">Time</th>
                <th className="pb-2">PnL</th>
              </tr>
            </thead>
            <tbody>
              {run.result.trades.map((t, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="py-1 pr-4">{t.time}</td>
                  <td className={`py-1 ${t.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {t.pnl >= 0 ? "+" : ""}{t.pnl.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
