type SignalType = "BUY" | "SELL";

interface SignalBadgeProps {
  signal: SignalType;
}

export function SignalBadge({ signal }: SignalBadgeProps) {
  const isBuy = signal === "BUY";
  return (
    <span
      aria-label={isBuy ? "Buy signal" : "Sell signal"}
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${
        isBuy
          ? "bg-green-500 text-white"
          : "bg-red-500 text-white"
      }`}
    >
      {signal}
    </span>
  );
}
