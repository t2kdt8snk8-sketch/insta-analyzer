import AgentFlow from '@/components/AgentFlow';
import { Toaster } from 'sonner';

export default function AgentPage() {
  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-6 sm:p-12 font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-4xl mx-auto space-y-12 mt-12">
        
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4">
             <span className="text-3xl">🤖</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
             Trend Research Agent
          </h1>
          <p className="text-lg text-muted-foreground w-full max-w-2xl mx-auto">
             질문 하나로 관련 인스타그램 트렌드를 종합 분석합니다. <br className="hidden sm:block"/>
             여러 계정을 자동으로 탐색하고 비교하여 핵심 인사이트를 도출하세요.
          </p>
        </header>

        <section className="flex flex-col items-center w-full pb-20">
           <AgentFlow />
        </section>

      </div>
      <Toaster position="top-center" />
    </main>
  );
}
