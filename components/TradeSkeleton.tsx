export function TradeSkeleton() {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4 animate-pulse">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 rounded bg-white/10" />
        <div className="h-5 w-14 rounded-full bg-white/10" />
      </div>

      {/* Chart placeholder */}
      <div className="h-28 w-full rounded-xl bg-white/10" />

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-16 rounded bg-white/10" />
            <div className="h-4 w-12 rounded bg-white/10" />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <div className="h-3 w-20 rounded bg-white/10" />
        <div className="h-8 w-24 rounded-lg bg-white/10" />
      </div>
    </div>
  );
}
