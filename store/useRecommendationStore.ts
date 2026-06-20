import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  createPersistedState,
  type PersistHydrationState,
  withPersistedHydration,
} from './persistHydration';

export type RiskProfile = 'conservative' | 'moderate' | 'aggressive';

export interface RecommendationFeedback {
  signalId: string;
  liked: boolean;
  timestamp: string;
}

export interface RecommendationSettings {
  enabled: boolean;
  riskProfile: RiskProfile;
  privacyAccepted: boolean;
}

export interface RecommendedSignal {
  signalId: string;
  score: number;
  reasons: string[];
}

interface RecommendationStore extends PersistHydrationState {
  settings: RecommendationSettings;
  feedback: RecommendationFeedback[];
  recommendations: RecommendedSignal[];
  accuracyMetrics: { total: number; correct: number };
  updateSettings: (patch: Partial<RecommendationSettings>) => void;
  addFeedback: (signalId: string, liked: boolean) => void;
  setRecommendations: (recs: RecommendedSignal[]) => void;
  recordAccuracy: (wasCorrect: boolean) => void;
}

export const useRecommendationStore = create<RecommendationStore>()(
  persist(
    (set) => ({
      ...createPersistedState<RecommendationStore>(set),
      settings: { enabled: true, riskProfile: 'moderate', privacyAccepted: false },
      feedback: [],
      recommendations: [],
      accuracyMetrics: { total: 0, correct: 0 },

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      addFeedback: (signalId, liked) =>
        set((s) => ({
          feedback: [
            { signalId, liked, timestamp: new Date().toISOString() },
            ...s.feedback.filter((f) => f.signalId !== signalId),
          ].slice(0, 200),
        })),

      setRecommendations: (recs) => set({ recommendations: recs }),

      recordAccuracy: (wasCorrect) =>
        set((s) => ({
          accuracyMetrics: {
            total: s.accuracyMetrics.total + 1,
            correct: s.accuracyMetrics.correct + (wasCorrect ? 1 : 0),
          },
        })),
    }),
    withPersistedHydration({ name: 'stellarswipe:recommendations' })
  )
);
