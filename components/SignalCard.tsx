import { SignalBadge } from "./SignalBadge";

interface SignalCardProps {
  asset: string;
  signal: "BUY" | "SELL";
  description?: string;
}

export function SignalCard({ asset, signal, description }: SignalCardProps) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-lg">{asset}</span>
        <SignalBadge signal={signal} />
      </div>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
