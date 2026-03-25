import { create } from 'zustand';
import { AgentReport } from '@/lib/scraper/types';
import { useAnalysisStore } from '@/store/useAnalysisStore';

export type AgentStep = 'idle' | 'discovering' | 'confirming' | 'verifying' | 'analyzing' | 'synthesizing' | 'done';

export interface DiscoveredAccount {
  username: string;
  reason: string;
}

export interface AgentDiscoveryResult {
  persona: string;
  analysis_criteria: string[];
  suggested_accounts: DiscoveredAccount[];
}

interface AgentState {
  currentStep: AgentStep;
  progress: number;
  error: string | null;
  
  prompt: string;
  userContext: string;
  discoveryResult: AgentDiscoveryResult | null;
  selectedAccounts: string[];
  analyzedData: any[];
  failedAccounts: string[];
  finalReport: AgentReport | null;
  currentAnalyzingAccount: string | null;
  metaInfo: { sessionCount: number; totalAccounts: number } | null;

  setPrompt: (prompt: string) => void;
  setUserContext: (ctx: string) => void;
  startDiscovery: () => Promise<void>;
  toggleAccountSelection: (username: string) => void;
  startAnalysisAndSynthesis: () => Promise<void>;
  loadFromHistory: (report: AgentReport, analyzedData: any[]) => void;
  loadMetaResult: (report: AgentReport, analyzedData: any[], metaInfo: { sessionCount: number; totalAccounts: number }) => void;
  reset: () => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  currentStep: 'idle',
  progress: 0,
  error: null,
  
  prompt: '',
  userContext: '',
  discoveryResult: null,
  selectedAccounts: [],
  analyzedData: [],
  failedAccounts: [],
  finalReport: null,
  currentAnalyzingAccount: null,
  metaInfo: null,

  setPrompt: (prompt) => set({ prompt }),
  setUserContext: (userContext) => set({ userContext }),
  
  toggleAccountSelection: (username) => {
    const { selectedAccounts } = get();
    if (selectedAccounts.includes(username)) {
      set({ selectedAccounts: selectedAccounts.filter(u => u !== username) });
    } else {
      set({ selectedAccounts: [...selectedAccounts, username] });
    }
  },

  loadFromHistory: (report: AgentReport, analyzedData: any[]) => {
    set({ finalReport: report, analyzedData, currentStep: 'done', error: null, metaInfo: null });
  },

  loadMetaResult: (report: AgentReport, analyzedData: any[], metaInfo) => {
    set({ finalReport: report, analyzedData, currentStep: 'done', error: null, metaInfo });
  },

  reset: () => set({
     currentStep: 'idle',
     progress: 0,
     error: null,
     prompt: '',
     userContext: '',
     discoveryResult: null,
     selectedAccounts: [],
     analyzedData: [],
     failedAccounts: [],
     finalReport: null,
     currentAnalyzingAccount: null,
     metaInfo: null,
  }),

  startDiscovery: async () => {
    const { prompt, userContext } = get();
    if (!prompt) return;

    // 이미 분석한 계정 목록 (트렌드 리서치 + 단일 계정 분석 모두 포함)
    const { useAnalysisStore } = await import('@/store/useAnalysisStore');
    const previousAccounts = useAnalysisStore.getState().history
      .map(h => h.username.replace('@', '').replace('[트렌드] ', ''))
      .filter(u => !u.startsWith('['));

    set({
      currentStep: 'discovering',
      progress: 10,
      error: null,
      discoveryResult: null
    });

    try {
        const res = await fetch('/api/agent/discover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, userContext: userContext || undefined, previousAccounts: previousAccounts.length > 0 ? previousAccounts : undefined })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || '계정 탐색 중 오류가 발생했습니다.');

        set({
            currentStep: 'confirming',
            progress: 30,
            discoveryResult: data.result,
            selectedAccounts: data.result?.suggested_accounts?.map((a: any) => a.username) || []
        });

    } catch (e: any) {
        set({ currentStep: 'idle', progress: 0, error: e.message });
    }
  },

  startAnalysisAndSynthesis: async () => {
    const { prompt, selectedAccounts } = get();
    if (selectedAccounts.length === 0) {
      set({ error: '최소 한 개의 계정을 선택해주세요.' });
      return;
    }

    // ── Step 1: 계정 존재 여부 사전 확인 ─────────────────────────────
    set({ currentStep: 'verifying', progress: 33, error: null });

    let verifiedAccounts = selectedAccounts;
    try {
      const verifyRes = await fetch('/api/agent/verify-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: selectedAccounts }),
      });

      if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        const { valid, invalid } = verifyData as { valid: string[]; invalid: string[] };

        if (invalid.length > 0) {
          console.log(`[Store] 존재하지 않는 계정 제외: ${invalid.join(', ')}`);
        }

        if (valid.length === 0) {
          set({ currentStep: 'confirming', progress: 30, error: `선택된 계정이 모두 존재하지 않습니다 (${invalid.join(', ')}). AI가 잘못된 계정을 추천했습니다. 다시 탐색해주세요.` });
          return;
        }

        verifiedAccounts = valid;

        if (invalid.length > 0) {
          // 잘못된 계정을 선택 목록에서 제거
          set({ selectedAccounts: valid });
        }
      }
      // verifyRes not ok → 검증 실패, 원래 목록으로 계속 진행
    } catch {
      // 네트워크 오류 등 → 검증 건너뛰고 계속
    }

    set({ currentStep: 'analyzing', progress: 40, error: null, analyzedData: [], failedAccounts: [] });

    try {
        // Vercel Timeout(보통 10~60초)을 피하기 위해 클라이언트에서 순차적으로 단일 계정 분석 API를 호출합니다.
        const analyzedResults: any[] = [];
        const total = verifiedAccounts.length;

        for (let i = 0; i < total; i++) {
            const username = verifiedAccounts[i];
            set({ currentAnalyzingAccount: username, progress: 40 + (i / total) * 40 });
            if (i > 0) await new Promise(r => setTimeout(r, 4000)); // Instagram 차단 방지 딜레이
            
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            
            const data = await res.json();
            if (!res.ok) {
                console.warn(`Failed to analyze ${username}:`, data.error);
                set(state => ({ failedAccounts: [...state.failedAccounts, username] }));
                continue;
            }
            
            analyzedResults.push({
                profile: data.profile,
                posts: data.posts || [],
                visuals: data.visual_analysis,
                captions: data.caption_analysis,
                report: data.report,
            } as any);
        }

        if (analyzedResults.length === 0) {
            throw new Error('성공적으로 분석된 계정이 없습니다.');
        }

        set({ currentStep: 'synthesizing', progress: 85, analyzedData: analyzedResults, currentAnalyzingAccount: null });

        // 종합 리포트 생성
        const synthRes = await fetch('/api/agent/synthesize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, analyzedData: analyzedResults })
        });

        const synthData = await synthRes.json();
        if (!synthRes.ok) throw new Error(synthData.error || '종합 리포트 생성 중 오류가 발생했습니다.');

        set({ currentStep: 'done', progress: 100, finalReport: synthData.report });

        const storeState = useAnalysisStore.getState();

        // 트렌드 리서치 결과 히스토리 저장
        storeState.addToHistory({
          id: `trend-${Date.now()}`,
          type: 'trend',
          username: `[트렌드] ${prompt}`,
          analyzed_at: new Date().toISOString(),
          data: { report: synthData.report, trend_accounts: analyzedResults },
        });

        // 트렌드에서 분석한 개별 계정들도 계정 분석 히스토리에 저장
        for (const acc of analyzedResults) {
          if (!acc.profile?.username) continue;
          storeState.addToHistory({
            id: `${Date.now()}-${acc.profile.username}`,
            type: 'account',
            username: acc.profile.username,
            analyzed_at: new Date().toISOString(),
            data: {
              profile: acc.profile,
              posts: acc.posts,
              visual_analysis: acc.visuals,
              caption_analysis: acc.captions,
              report: acc.report,
            },
          });
        }

    } catch (e: any) {
        set({ currentStep: 'confirming', progress: 30, error: e.message, currentAnalyzingAccount: null });
    }
  }
}));