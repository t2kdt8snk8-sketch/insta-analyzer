import { NextResponse } from 'next/server';
import { GeminiProvider } from '@/lib/ai/provider';

export const maxDuration = 60; // Set timeout to 60 seconds

export async function POST(req: Request) {
  try {
    const { prompt, userContext, previousAccounts } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    console.log(`[Agent API] Starting discovery for prompt: "${prompt}"`);

    const provider = new GeminiProvider();
    const result = await provider.discoverAccounts(prompt, userContext, previousAccounts);

    return NextResponse.json({ result });

  } catch (error: any) {
    console.error('[Agent API] Discovery Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
