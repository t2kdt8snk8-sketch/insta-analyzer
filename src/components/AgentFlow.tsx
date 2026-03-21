"use client";
import { useAgentStore } from '@/store/useAgentStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import AgentReportCard from '@/components/AgentReportCard';

export default function AgentFlow() {
  const {
    currentStep,
    progress,
    error,
    prompt,
    userContext,
    discoveryResult,
    selectedAccounts,
    currentAnalyzingAccount,
    analyzedData,
    failedAccounts,
    finalReport,
    setPrompt,
    setUserContext,
    startDiscovery,
    toggleAccountSelection,
    startAnalysisAndSynthesis,
    reset
  } = useAgentStore();

  const handleDiscover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return toast.error('질문을 입력해주세요');
    await startDiscovery();
  };

  return (
    <div className="w-full space-y-8">
      
      {/* Step 1: Input */}
      {currentStep === 'idle' && (
        <form onSubmit={handleDiscover} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="prompt" className="text-xs font-black uppercase tracking-widest text-slate-400">분석 주제</Label>
            <Input
              id="prompt"
              placeholder="예: 최신 음악 매거진들의 인스타그램 피드 트렌드"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="rounded-lg h-12 border-slate-200 focus-visible:ring-primary/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="userContext" className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400">
              내 계정 목표
              <span className="text-[10px] text-muted-foreground font-normal lowercase">(optional)</span>
            </Label>
            <Input
              id="userContext"
              placeholder="예: 라이프스타일 매거진 운영 중"
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              className="rounded-lg h-12 border-slate-200 focus-visible:ring-primary/20"
            />
          </div>
          {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
          <Button className="w-full h-12 rounded-lg font-bold text-base shadow-md" type="submit">트렌드 탐색 시작하기</Button>
        </form>
      )}

      {/* Loading States */}
      {(currentStep === 'discovering' || currentStep === 'analyzing' || currentStep === 'synthesizing') && (
        <Card className="rounded-xl border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="pt-10 pb-12 space-y-6 text-center">
             <div className="flex flex-col items-center gap-4">
               <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
               <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  {currentStep === 'discovering' && "AI가 관련 트렌드와 페르소나를 탐색 중입니다..."}
                  {currentStep === 'analyzing' && `${currentAnalyzingAccount || '계정'} 심층 분석 중...`}
                  {currentStep === 'synthesizing' && "종합 트렌드 리포트를 작성하는 중..."}
               </h3>
             </div>
             <div className="max-w-md mx-auto">
               <Progress value={progress} className="h-2 rounded-full bg-slate-100" />
             </div>
             {error && (
               <div className="space-y-3 pt-4">
                 <p className="text-red-500 text-sm font-medium">{error}</p>
                 <Button variant="outline" size="sm" onClick={reset} className="rounded-md">다시 시작하기</Button>
               </div>
             )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Confirmation & Selection */}
      {currentStep === 'confirming' && discoveryResult && (
        <div className="space-y-8">
          {error && (
             <div className="p-4 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-100">
                {error}
             </div>
          )}
          <Card className="rounded-xl border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-indigo-500">
             <CardHeader className="bg-slate-50 border-b border-slate-100">
               <CardTitle className="text-lg font-black">AI 탐색 결과</CardTitle>
             </CardHeader>
             <CardContent className="pt-6 space-y-6">
                <div>
                   <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-2">분석 페르소나</h4>
                   <p className="text-base font-bold text-slate-800 bg-slate-50 p-4 rounded-lg border border-slate-100">"{discoveryResult.persona}"</p>
                </div>
                <div>
                   <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-2">핵심 분석 기준</h4>
                   <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600 font-medium">
                      {discoveryResult.analysis_criteria.map((c, i) => (
                        <li key={i} className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-md border border-slate-100">
                          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                          {c}
                        </li>
                      ))}
                   </ul>
                </div>
             </CardContent>
          </Card>

          <Card className="rounded-xl border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-teal-500">
             <CardHeader className="bg-slate-50 border-b border-slate-100">
               <CardTitle className="text-lg font-black">분석 대상 확정</CardTitle>
               <p className="text-xs text-slate-500 font-medium">
                 아래 계정들을 개별 분석한 뒤 트렌드를 종합합니다. 원치 않는 계정은 제외하세요.
               </p>
             </CardHeader>
             <CardContent className="pt-6 space-y-3">
               {discoveryResult.suggested_accounts.map((acc, i) => (
                  <div key={i} className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                    <Checkbox 
                       id={`acc-${i}`} 
                       checked={selectedAccounts.includes(acc.username)}
                       onCheckedChange={() => toggleAccountSelection(acc.username)}
                       className="mt-1 rounded border-slate-300"
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor={`acc-${i}`} className="text-sm font-black text-slate-900 cursor-pointer">
                        @{acc.username}
                      </label>
                      <p className="text-xs text-slate-500 leading-relaxed">{acc.reason}</p>
                    </div>
                  </div>
               ))}
               <Button className="w-full mt-6 h-12 rounded-lg font-bold text-base shadow-md" onClick={startAnalysisAndSynthesis}>
                 선택된 {selectedAccounts.length}개 계정 분석 및 리포트 생성
               </Button>
             </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Final Report */}
      {currentStep === 'done' && finalReport && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <AgentReportCard report={finalReport} analyzedData={analyzedData} failedAccounts={failedAccounts} />
           <Button variant="outline" className="w-full" onClick={reset}>새로운 분석 시작하기</Button>
        </div>
      )}
    </div>
  );
}
