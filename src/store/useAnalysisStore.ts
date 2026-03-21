import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type AnalysisStep = 'idle' | 'scraping' | 'analyzing' | 'generating_report';

export interface HistoryItem {
  id: string;
  type: 'account' | 'trend';
  username: string;
  analyzed_at: string;
  data: any; // full API response
}

const MAX_HISTORY = 30;
const STORAGE_KEY = 'insta-analyzer-history';

// 기존 배열 형식의 데이터를 persist 미들웨어 형식으로 마이그레이션하는 커스텀 storage
const migratingStorage = {
  getItem: (key: string): string | null => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      // 기존 형식: 최상위가 배열인 경우 → persist 형식으로 변환
      if (Array.isArray(parsed)) {
        return JSON.stringify({ state: { history: parsed }, version: 0 });
      }
      return raw;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
  removeItem: (key: string) => localStorage.removeItem(key),
};

interface AnalysisState {
  isAnalyzing: boolean;
  currentStep: AnalysisStep;
  progress: number;
  error: string | null;

  currentReport: any | null;
  currentTrendReport: any | null;
  isHistoryView: boolean; // true = 히스토리에서 로드됨 (대시보드에서 표시 안 함)

  history: HistoryItem[];

  startAnalysis: (username: string) => Promise<void>;
  addToHistory: (item: HistoryItem) => void;
  loadFromHistory: (item: HistoryItem) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set, get) => ({
      isAnalyzing: false,
      currentStep: 'idle',
      progress: 0,
      error: null,
      currentReport: null,
      currentTrendReport: null,
      isHistoryView: false,
      history: [],

      reset: () => set({
        isAnalyzing: false,
        currentStep: 'idle',
        progress: 0,
        error: null,
        currentReport: null,
        isHistoryView: false,
      }),

      addToHistory: (item: HistoryItem) => {
        const prev = item.type === 'account'
          ? get().history.filter(h => !(h.type === 'account' && h.username === item.username))
          : get().history.filter(h => h.id !== item.id);
        const next = [item, ...prev].slice(0, MAX_HISTORY);
        set({ history: next });
      },

      loadFromHistory: (item: HistoryItem) => {
        set({ currentReport: item.data, error: null, isHistoryView: true });
      },

      removeFromHistory: (id: string) => {
        const next = get().history.filter(h => h.id !== id);
        set({ history: next });
      },

      clearHistory: () => {
        set({ history: [] });
      },

      startAnalysis: async (username: string) => {
        set({ isAnalyzing: true, currentStep: 'scraping', progress: 20, error: null, currentReport: null });

        try {
          set({ currentStep: 'scraping', progress: 40 });
          const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username }),
          });

          const data = await res.json();

          if (!res.ok) {
            if (data.error === 'SESSION_EXPIRED') throw new Error('SESSION_EXPIRED');
            throw new Error(data.error || '분석 중 오류가 발생했습니다.');
          }

          const newItem: HistoryItem = {
            id: `${Date.now()}`,
            type: 'account',
            username: data.profile?.username ?? username,
            analyzed_at: new Date().toISOString(),
            data,
          };
          const prev = get().history.filter(h => !(h.type === 'account' && h.username === newItem.username));
          const next = [newItem, ...prev].slice(0, MAX_HISTORY);

          set({
            isAnalyzing: false,
            currentStep: 'idle',
            progress: 100,
            currentReport: data,
            isHistoryView: false,
            history: next,
          });

        } catch (e: any) {
          set({ isAnalyzing: false, currentStep: 'idle', progress: 0, error: e.message });
        }
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => migratingStorage),
      // currentReport/currentTrendReport 같은 UI 상태는 저장하지 않음, 히스토리만 유지
      partialize: (state) => ({ history: state.history }),
    }
  )
);

