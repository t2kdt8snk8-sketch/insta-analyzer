"use client"
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AnalysisForm from "@/components/AnalysisForm";
import AgentFlow from "@/components/AgentFlow";
import ReportCard from "@/components/ReportCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, UserSearch, TrendingUp, ArrowLeft } from "lucide-react";
import { useAnalysisStore } from "@/store/useAnalysisStore";
import { useAgentStore } from "@/store/useAgentStore";
import { Button } from "@/components/ui/button";

function HomeContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") === "trend" ? "trend" : "account";
  const { currentReport, isAnalyzing, error, reset, isHistoryView } = useAnalysisStore();
  const { currentStep: agentStep, reset: agentReset } = useAgentStore();
  const showResult = isAnalyzing || (!!currentReport && !isHistoryView) || !!error;
  const showTrendResult = agentStep !== 'idle';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full pb-32">

      {/* Header section with intro */}
      <div className="flex flex-col space-y-4">
        <div className="inline-flex items-center gap-2 p-2 px-3 bg-primary/10 text-primary border border-primary/20 rounded-full w-fit">
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span className="text-xs font-bold tracking-widest uppercase">인사이트 분석 엔진 V2</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
          통합 분석 파이프라인
        </h1>
        <p className="text-muted-foreground max-w-2xl leading-relaxed text-sm sm:text-base font-medium">
          인스타그램 계정에 대한 정밀 분석과 시장 트렌드 리서치를 원클릭으로 실행합니다.
          원하시는 분석 모드를 선택해주세요.
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="h-12 p-0 bg-transparent border-b border-slate-200 rounded-none mb-8 w-full grid grid-cols-2 gap-0">
          <TabsTrigger
            value="account"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary transition-all text-sm font-bold pb-3 shadow-none"
          >
            <UserSearch className="w-4 h-4" /> 계정 정밀 분석
          </TabsTrigger>
          <TabsTrigger
            value="trend"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:text-teal-600 transition-all text-sm font-bold pb-3 shadow-none"
          >
            <TrendingUp className="w-4 h-4" /> 시장 트렌드 리서치
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-8 mt-0 w-full focus-visible:outline-none focus-visible:ring-0">
          {!showResult ? (
            <div className="p-8 sm:p-12 rounded-xl border border-slate-200 bg-white shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-50 blur-[120px] rounded-full pointer-events-none -mt-32 -mr-32" />
              <div className="relative z-10 w-full flex flex-col items-center text-center">
                <h2 className="text-xl sm:text-2xl font-bold mb-2 text-slate-900">타겟 프로필 분석</h2>
                <p className="text-sm text-slate-500 mb-8">분석하고 싶은 인스타그램 아이디를 입력하여 비주얼/캡션 전략을 추출하세요.</p>
                <AnalysisForm />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                variant="ghost"
                onClick={reset}
                className="gap-2 text-slate-500 hover:text-slate-900 -ml-2"
              >
                <ArrowLeft className="w-4 h-4" />
                새 계정 분석하기
              </Button>
              <ReportCard />
            </div>
          )}
        </TabsContent>

        <TabsContent value="trend" className="space-y-8 mt-0 w-full focus-visible:outline-none focus-visible:ring-0">
          {!showTrendResult ? (
            <div className="p-8 sm:p-12 rounded-xl border border-slate-200 bg-white shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-50 blur-[120px] rounded-full pointer-events-none -mt-32 -mr-32" />
              <div className="relative z-10 w-full">
                <div className="text-center mb-8">
                  <h2 className="text-xl sm:text-2xl font-bold mb-2 text-slate-900">매크로 트렌드 분석</h2>
                  <p className="text-sm text-slate-500">특정 키워드나 제품군의 전반적인 해시태그 확산 트렌드를 조사합니다.</p>
                </div>
                <AgentFlow />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {agentStep === 'done' && (
                <Button
                  variant="ghost"
                  onClick={agentReset}
                  className="gap-2 text-slate-500 hover:text-slate-900 -ml-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  새 트렌드 분석하기
                </Button>
              )}
              <AgentFlow />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="h-screen" />}>
      <HomeContent />
    </Suspense>
  );
}
