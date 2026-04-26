type SignalType = "BUY" | "SELL" | "NEUTRAL";

interface SignalBadgeProps {
  signal: SignalType;
}

const styles: Record<SignalType, string> = {
  BUY: "bg-green-500 text-white",
  SELL: "bg-red-500 text-white",
  NEUTRAL: "bg-slate-500 text-white",
};

export function SignalBadge({ signal }: SignalBadgeProps) {
  return (
    <span
      aria-label={`${signal} signal`}
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${styles[signal]}`}
    >
      {signal}
    </span>
  );
}
