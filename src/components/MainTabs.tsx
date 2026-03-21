"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AnalysisForm from "@/components/AnalysisForm";
import ReportCard from "@/components/ReportCard";
import AgentFlow from "@/components/AgentFlow";

export default function MainTabs() {
  return (
    <Tabs defaultValue="account" className="w-full">
      <TabsList className="grid w-full grid-cols-2 h-12 mb-2">
        <TabsTrigger value="account" className="text-sm font-medium">
          🔍 계정 분석
        </TabsTrigger>
        <TabsTrigger value="trend" className="text-sm font-medium">
          📊 트렌드 리서치
        </TabsTrigger>
      </TabsList>

      <TabsContent value="account" className="mt-6 space-y-6">
        <p className="text-center text-sm text-muted-foreground">
          인스타그램 아이디를 입력하면 비주얼, 캡션, 전략을 분석해드려요
        </p>
        <div className="flex flex-col items-center w-full">
          <AnalysisForm />
        </div>
        <div className="w-full pb-20">
          <ReportCard />
        </div>
      </TabsContent>

      <TabsContent value="trend" className="mt-6 space-y-6 pb-20">
        <p className="text-center text-sm text-muted-foreground">
          궁금한 트렌드를 자연어로 질문하면 관련 계정들을 분석해 인사이트를 드려요
        </p>
        <AgentFlow />
      </TabsContent>
    </Tabs>
  );
}
