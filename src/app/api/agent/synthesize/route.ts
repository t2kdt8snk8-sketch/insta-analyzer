import { NextResponse } from 'next/server';
import { GeminiProvider, FullAnalysisData } from '@/lib/ai/provider';

export const maxDuration = 60; // Set timeout to 60 seconds

export async function POST(req: Request) {
  try {
    const { prompt, analyzedData } = await req.json();
    
    if (!prompt || !analyzedData || !Array.isArray(analyzedData)) {
      return NextResponse.json({ error: 'Prompt and analyzedData are required.' }, { status: 400 });
    }

    console.log(`[Agent API] Synthesizing report for ${analyzedData.length} accounts...`);

    const provider = new GeminiProvider();
    
    const finalReport = await provider.generateAgenticReport(prompt, analyzedData);

    // (선택) Supabase에 Agent 리포트 저장 로직 필요하다면 이곳에 추가

    console.log(`[Agent API] Synthesis completed.`);

    return NextResponse.json({ report: finalReport });

  } catch (error: any) {
    console.error('[Agent API] Synthesis Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
