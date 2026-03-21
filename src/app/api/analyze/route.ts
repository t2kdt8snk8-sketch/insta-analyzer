import { NextResponse } from 'next/server';
import { scrapeProfileAndPosts } from '@/lib/scraper/instagram';
import { SessionExpiredError } from '@/lib/scraper/session';
import { GeminiProvider, FullAnalysisData } from '@/lib/ai/provider';
import { supabase } from '@/lib/supabase/client';

export const maxDuration = 60; // Set timeout to 60 seconds

interface AnalyzeRequest {
  username: string;
}

export async function POST(req: Request) {
  try {
    const body: AnalyzeRequest = await req.json();
    if (!body.username) {
      return NextResponse.json({ error: 'Instagram username is required.' }, { status: 400 });
    }

    const username = body.username.replace('@', '').trim();
    console.log(`[API] Starting analysis for @${username}`);

    // 1. Scrape data
    let profile, posts;
    try {
        const result = await scrapeProfileAndPosts(username, 12);
        profile = result.profile;
        posts = result.posts;
    } catch (err) {
        if (err instanceof SessionExpiredError || (err as Error).name === 'SessionExpiredError') {
             return NextResponse.json({ 
                 error: 'SESSION_EXPIRED', 
                 message: 'Instagram 세션이 만료되었습니다. 로컬에서 수동 로그인을 진행해주세요.' 
             }, { status: 401 });
        }
        console.error('Scraper Error:', err);
        return NextResponse.json({ error: '계정 데이터를 가져오는 중 오류가 발생했습니다. 비공개이거나 차단되었을 수 있습니다.' }, { status: 500 });
    }

    // 2. Prepare AI
    const provider = new GeminiProvider();
    const captions = posts.map((p: any) => p.caption).filter(Boolean) as string[];
    const imageData = posts.flatMap((p: any) => p.image_data ?? []).slice(0, 9) as { base64: string; mimeType: string }[];
    console.log(`[API] Collected ${imageData.length} images from ${posts.length} posts`);

    // 3. Parallel AI processing (캡션이 없는 계정은 캡션 분석 건너뜀)
    const [visualAnalysis, captionAnalysis] = await Promise.all([
        provider.analyzeVisuals(imageData),
        captions.length > 0
            ? provider.analyzeCaptions(captions)
            : Promise.resolve({ tone_manner: null, content_categories: null, caption_strategy: null, hashtag_strategy: null, engagement_style: null, summary: '캡션 데이터 없음' })
    ]);

    // 4. Synthesize full report
    const fullData: FullAnalysisData = {
        profile,
        posts,
        visuals: visualAnalysis,
        captions: captionAnalysis
    };

    const finalReport = await provider.generateAccountReport(fullData);

    // 5. Save to Supabase (Non-blocking)
    if(process.env.NEXT_PUBLIC_SUPABASE_URL) {
        supabase.from('analyses').insert({
            username: profile.username,
            profile_data: profile,
            visual_analysis: visualAnalysis,
            caption_analysis: captionAnalysis,
            report: finalReport
        }).then(({ error }) => {
            if (error) console.error('[Supabase] Failed to save history:', error);
            else console.log(`[Supabase] Saved history for @${username}`);
        });
    }

    console.log(`[API] Analysis completed for @${username}`);

    return NextResponse.json({
        profile,
        posts: posts.map((p: any) => ({
            post_url: p.post_url,
            image_urls: p.image_urls,
            caption: p.caption,
            hashtags: p.hashtags,
            likes_count: p.likes_count,
            comments_count: p.comments_count,
            is_reel: p.is_reel,
            is_carousel: p.is_carousel,
        })),
        visual_analysis: visualAnalysis,
        caption_analysis: captionAnalysis,
        report: finalReport
    });

  } catch (error: any) {
    console.error('[API] Global Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
