"use client";

import { cn } from "@/lib/utils";
import {
  useSwipeSettingsStore,
  type SensitivityLevel,
  SENSITIVITY_MULTIPLIERS,
  getEffectiveSwipeThreshold,
  getEffectiveVelocityThreshold,
} from "@/store/useSwipeSettingsStore";

// Sensitivity levels in display order
const SENSITIVITY_LEVELS: {
  value: SensitivityLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "low",
    label: "Low",
    description: "Harder to trigger — requires a longer drag",
  },
  { value: "default", label: "Default", description: "Original behaviour" },
  {
    value: "high",
    label: "High",
    description: "Easier to trigger — shorter drag commits the swipe",
  },
];

/**
 * SwipeSettings — settings section for tuning swipe gesture behaviour.
 *
 * Exposes two controls:
 *  1. Sensitivity slider — adjusts the drag distance / velocity required to
 *     commit a swipe action (trade or pass).
 *  2. Direction swap toggle — reverses left/right action mapping, so right
 *     swipe → pass and left swipe → trade.
 *
 * All changes are persisted immediately via the Zustand store and take effect
 * without a page reload.
 *
 * @example
 * <SwipeSettings />
 */
export function SwipeSettings({ className }: { className?: string }) {
  const {
    sensitivity,
    swapDirections,
    setSensitivity,
    setSwapDirections,
    resetToDefaults,
  } = useSwipeSettingsStore();

  const swipeThreshold = getEffectiveSwipeThreshold(sensitivity);
  const velocityThreshold = getEffectiveVelocityThreshold(sensitivity);

  // Convert sensitivity to a 0–2 slider index for the range input
  const sensitivityIndex = SENSITIVITY_LEVELS.findIndex(
    (l) => l.value === sensitivity
  );
  const selectedLevel = SENSITIVITY_LEVELS[sensitivityIndex];

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const idx = Number(e.target.value);
    const level = SENSITIVITY_LEVELS[idx];
    if (level) setSensitivity(level.value);
  }

  const isDefault = sensitivity === "default" && !swapDirections;

  return (
    <section
      aria-labelledby="swipe-settings-heading"
      className={cn(
        "flex flex-col gap-5 rounded-2xl border bg-card p-5",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2
            id="swipe-settings-heading"
            className="text-base font-semibold leading-tight"
          >
            Swipe Settings
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Customise how swipe gestures trigger trade or pass actions.
          </p>
        </div>

        {!isDefault && (
          <button
            type="button"
            onClick={resetToDefaults}
            className="rounded-md px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Reset swipe settings to defaults"
          >
            Reset
          </button>
        )}
      </div>

      {/* ── Sensitivity slider ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label
            htmlFor="swipe-sensitivity-slider"
            className="text-sm font-medium"
          >
            Sensitivity
          </label>
          <span
            className="text-sm font-semibold text-blue-400"
            aria-live="polite"
            aria-atomic="true"
          >
            {selectedLevel?.label ?? "Default"}
          </span>
        </div>

        {/* Slider track */}
        <div className="relative flex items-center">
          {/* Background track */}
          <div
            className="absolute h-1.5 w-full rounded-full bg-muted"
            aria-hidden="true"
          />
          {/* Filled portion */}
          <div
            className="absolute h-1.5 rounded-full bg-blue-500 transition-all duration-75"
            style={{
              width: `${
                (sensitivityIndex / (SENSITIVITY_LEVELS.length - 1)) * 100
              }%`,
            }}
            aria-hidden="true"
          />
          <input
            id="swipe-sensitivity-slider"
            type="range"
            min={0}
            max={SENSITIVITY_LEVELS.length - 1}
            step={1}
            value={sensitivityIndex}
            onChange={handleSliderChange}
            aria-label="Swipe sensitivity"
            aria-valuemin={0}
            aria-valuemax={SENSITIVITY_LEVELS.length - 1}
            aria-valuenow={sensitivityIndex}
            aria-valuetext={`${selectedLevel?.label ?? "Default"} — ${
              selectedLevel?.description ?? ""
            }`}
            className={cn(
              "relative w-full cursor-pointer appearance-none bg-transparent h-5",
              "focus:outline-none",
              "[&::-webkit-slider-thumb]:appearance-none",
              "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
              "[&::-webkit-slider-thumb]:rounded-full",
              "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background",
              "[&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-md",
              "[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-100",
              "[&::-webkit-slider-thumb]:hover:scale-110",
              "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4",
              "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2",
              "[&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:shadow-md",
              "focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-ring focus-visible:[&::-webkit-slider-thumb]:ring-offset-1"
            )}
          />
        </div>

        {/* Tick labels */}
        <div
          className="flex justify-between text-xs text-muted-foreground select-none"
          aria-hidden="true"
        >
          {SENSITIVITY_LEVELS.map((l) => (
            <span key={l.value}>{l.label}</span>
          ))}
        </div>

        {/* Description text */}
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {selectedLevel?.description}
          {sensitivity !== "default" && (
            <span className="ml-1 tabular-nums text-blue-400/80">
              ({swipeThreshold}px · {velocityThreshold}px/s)
            </span>
          )}
        </p>
      </div>

      {/* ── Direction swap toggle ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">Swap directions</span>
          <span className="text-xs text-muted-foreground">
            {swapDirections
              ? "Right → Pass · Left → Trade"
              : "Right → Trade · Left → Pass (default)"}
          </span>
        </div>

        {/* Toggle switch */}
        <button
          type="button"
          role="switch"
          aria-checked={swapDirections}
          aria-label="Swap swipe directions"
          onClick={() => setSwapDirections(!swapDirections)}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent",
            "transition-colors duration-200 ease-in-out",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            swapDirections ? "bg-blue-600" : "bg-muted"
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0",
              "transition duration-200 ease-in-out",
              swapDirections ? "translate-x-5" : "translate-x-0"
            )}
          />
        </button>
      </div>

      {/* ── Visual preview of the current mapping ─────────────────────────── */}
      <div
        className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-2.5 text-xs text-muted-foreground"
        aria-label="Current swipe direction mapping"
      >
        <span className="flex items-center gap-1.5">
          <span className="text-red-400" aria-hidden="true">
            ←
          </span>
          {swapDirections ? "Trade" : "Pass"}
        </span>
        <span className="text-muted-foreground/60" aria-hidden="true">
          |
        </span>
        <span className="flex items-center gap-1.5">
          {swapDirections ? "Pass" : "Trade"}
          <span className="text-green-400" aria-hidden="true">
            →
          </span>
        </span>
      </div>
    </section>
  );
}
