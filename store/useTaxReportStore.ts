import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TaxJurisdiction, TaxableTrade } from "@/lib/taxReport";

interface TaxReportState {
  jurisdiction: TaxJurisdiction;
  selectedYear: number;
  trades: TaxableTrade[];
  anonymizeData: boolean;
  setJurisdiction: (j: TaxJurisdiction) => void;
  setSelectedYear: (year: number) => void;
  setTrades: (trades: TaxableTrade[]) => void;
  setAnonymizeData: (v: boolean) => void;
}

const currentYear = new Date().getFullYear();

export const useTaxReportStore = create<TaxReportState>()(
  persist(
    (set) => ({
      jurisdiction: "US",
      selectedYear: currentYear - 1, // default to last completed tax year
      trades: [],
      anonymizeData: false,
      setJurisdiction: (jurisdiction) => set({ jurisdiction }),
      setSelectedYear: (selectedYear) => set({ selectedYear }),
      setTrades: (trades) => set({ trades }),
      setAnonymizeData: (anonymizeData) => set({ anonymizeData }),
    }),
    { name: "tax-report-store" }
  )
);
