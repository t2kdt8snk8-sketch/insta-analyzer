"use client"
import { useState } from 'react';
import { useAnalysisStore } from '@/store/useAnalysisStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Search, Loader2 } from 'lucide-react';

const STEP_MESSAGES: Record<string, string> = {
  'idle': '처리 준비 중...',
  'scraping': '최근 데이터 및 미디어 추출 중...',
  'analyzing': '비주얼 패턴 및 텍스트 톤앤매너 분석 중...',
  'synthesizing': '핵심 트렌드 및 인사이트 도출 중...',
  'done': '분석 보고서 작성 완료!'
};

export default function AnalysisForm() {
  const [username, setUsername] = useState('');
  const { isAnalyzing, startAnalysis, currentStep } = useAnalysisStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!username) return toast.error('아이디를 입력해주세요');
    
    try {
        await startAnalysis(username);
    } catch (e: any) {
        if(e.message === 'SESSION_EXPIRED') {
            toast.error('세션이 만료되었습니다. 터미널에서 npm run login:instagram 을 실행해주세요.');
        } else {
            toast.error(e.message || '분석 중 오류가 발생했습니다.');
        }
    }
  };

  return (
    <div className="w-full flex justify-center animate-in slide-in-from-bottom-8 fade-in duration-700">
      <form onSubmit={handleSubmit} className="relative w-full max-w-2xl group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/40 to-teal-500/40 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
        <div className="relative flex items-center bg-card border border-border/50 shadow-xl rounded-xl p-1.5 pr-2 transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40">
          <div className="pl-5 pr-3 hidden sm:flex pointer-events-none">
            <Search className={`w-5 h-5 transition-colors duration-500 ${isAnalyzing ? 'text-primary animate-pulse' : 'text-muted-foreground group-focus-within:text-foreground'}`} />
          </div>
          <Input 
            id="username"
            placeholder="인스타그램 아이디를 입력하세요 (예: zuckerberg)" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isAnalyzing}
            className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 text-base sm:text-lg py-5 px-4 sm:px-0 placeholder:text-muted-foreground/60 focus-visible:ring-offset-0 disabled:opacity-50"
            autoComplete="off"
          />
          <Button 
            disabled={isAnalyzing || !username.trim()} 
            size="lg"
            className="rounded-lg px-6 sm:px-8 py-5 h-auto text-base tracking-wide font-semibold shadow-md bg-foreground text-background hover:bg-foreground/90 transition-all duration-300 min-w-[120px] overflow-hidden relative" 
            type="submit"
          >
            {isAnalyzing ? (
              <div className="flex items-center justify-center gap-3 absolute inset-0 w-full h-full bg-primary text-primary-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm animate-pulse">{STEP_MESSAGES[currentStep] || '처리 중...'}</span>
              </div>
            ) : (
              '분석하기'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
