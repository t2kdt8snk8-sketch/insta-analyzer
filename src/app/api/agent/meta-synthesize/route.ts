import { NextResponse } from 'next/server';
import { GeminiProvider, MetaSession } from '@/lib/ai/provider';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { sessions } = await req.json() as { sessions: MetaSession[] };

    if (!sessions || !Array.isArray(sessions) || sessions.length < 2) {
      return NextResponse.json({ error: '최소 2개 세션이 필요합니다.' }, { status: 400 });
    }
    if (sessions.length > 3) {
      return NextResponse.json({ error: '최대 3개 세션까지 종합할 수 있습니다.' }, { status: 400 });
    }

    const totalAccounts = new Set(
      sessions.flatMap(s => s.accounts.map(a => a.profile?.username).filter(Boolean))
    ).size;

    console.log(`[Meta API] Synthesizing ${sessions.length} sessions, ${totalAccounts} unique accounts...`);

    const provider = new GeminiProvider();
    const report = await provider.generateMetaReport(sessions);

    return NextResponse.json({
      report,
      metaInfo: {
        sessionCount: sessions.length,
        totalAccounts,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[Meta API] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
