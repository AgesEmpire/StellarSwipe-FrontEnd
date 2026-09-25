import { useThemeStore, type ChartPalette } from "@/store/useThemeStore";

/**
 * Okabe–Ito palette — distinguishable under protanopia, deuteranopia and
 * tritanopia. Ordered so adjacent series differ in both hue and lightness.
 */
export const COLORBLIND_SAFE_COLORS = [
  "#0072B2", // blue
  "#E69F00", // orange
  "#56B4E9", // sky blue
  "#009E73", // bluish green
  "#F0E442", // yellow
  "#D55E00", // vermillion
  "#CC79A7", // reddish purple
  "#999999", // grey
] as const;

interface ChartColors {
  /** Primary series (e.g. portfolio value). */
  primary: string;
  /** Comparison series (e.g. benchmark). */
  secondary: string;
  /** Categorical color for the series at `index`, or `fallback` for the default palette. */
  series: (index: number, fallback: string) => string;
}

const PALETTES: Record<ChartPalette, ChartColors> = {
  default: {
    primary: "#22c55e",
    secondary: "#60a5fa",
    series: (_index, fallback) => fallback,
  },
  colorblind: {
    primary: COLORBLIND_SAFE_COLORS[0],
    secondary: COLORBLIND_SAFE_COLORS[1],
    series: (index) =>
      COLORBLIND_SAFE_COLORS[index % COLORBLIND_SAFE_COLORS.length],
  },
};

export function getChartColors(palette: ChartPalette): ChartColors {
  return PALETTES[palette] ?? PALETTES.default;
}

/** Chart colors for the user's persisted palette preference. */
export function useChartColors(): ChartColors {
  const palette = useThemeStore((s) => s.chartPalette);
  return getChartColors(palette);
}
