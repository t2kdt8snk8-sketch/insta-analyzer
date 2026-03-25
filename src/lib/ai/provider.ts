import { GoogleGenAI } from '@google/genai';
import {
  SYSTEM_PROMPT,
  VISUAL_ANALYSIS_PROMPT,
  CAPTION_ANALYSIS_PROMPT,
  CAPTION_ANALYSIS_PROMPT_SHORT,
  FULL_REPORT_PROMPT,
  AGENT_SYNTHESIS_PROMPT,
  META_SYNTHESIS_PROMPT,
  DISCOVERY_PROMPT
} from './prompts';
import { AgentReport } from '../scraper/types';

export interface VisualAnalysis {
  feed_tone: any;
  content_types: any;
  composition: any;
  grid_strategy: any;
  visual_identity: any;
  summary: string;
}

export interface CaptionAnalysis {
  tone_manner: any;
  content_categories: any;
  caption_strategy: any;
  hashtag_strategy: any;
  engagement_style: any;
  summary: string;
}

export interface FullAnalysisData {
  profile: any;
  posts: any[];
  visuals: VisualAnalysis;
  captions: CaptionAnalysis;
}

export interface AccountReport {
  summary: string;
  content_strategy: any;
  branding: any;
  growth_strategy: any;
  swot: any;
  benchmarking: any;
  recommendations: any;
}

export interface MetaSession {
  prompt: string;
  analyzed_at: string;
  accounts: FullAnalysisData[];
}

export interface AIProvider {
  analyzeVisuals(imageData: { base64: string; mimeType: string }[]): Promise<VisualAnalysis>;
  analyzeCaptions(captions: string[]): Promise<CaptionAnalysis>;
  generateAccountReport(data: FullAnalysisData): Promise<AccountReport>;
  discoverAccounts(prompt: string, userContext?: string, previousAccounts?: string[]): Promise<any>;
  generateAgenticReport(prompt: string, scrapedData: FullAnalysisData[]): Promise<AgentReport>;
  generateMetaReport(sessions: MetaSession[]): Promise<AgentReport>;
}

export class GeminiProvider implements AIProvider {
  private ai_client: GoogleGenAI;

  constructor(apiKey?: string) {
    this.ai_client = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY });
  }

  private async withRetry<T>(fn: () => Promise<T>, maxRetries = 3, delayMs = 5000): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (e: any) {
        const is503 = e?.status === 503 || e?.message?.includes('503') || e?.message?.includes('UNAVAILABLE');
        if (is503 && attempt < maxRetries) {
          console.log(`[AI] 503 에러 — ${delayMs / 1000}초 후 재시도 (${attempt}/${maxRetries})`);
          await new Promise(r => setTimeout(r, delayMs));
        } else {
          throw e;
        }
      }
    }
    throw new Error('Max retries exceeded');
  }

  private parseJsonResponse<T>(output: string): T {
    // JSON 블록 앞뒤에 설명 문구나 마크다운이 붙어도 JSON 부분만 추출
    const match = output.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch (e) {
        console.error('[AI] JSON parse failed on matched block. Raw output:', output.slice(0, 500));
        throw e;
      }
    }
    // 매칭 실패 시 기존 방식으로 폴백
    const cleaned = output.replace(/^```json\s*/im, '').replace(/```[\s\S]*$/im, '').trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch (e) {
      console.error('[AI] JSON parse failed on cleaned string. Raw output:', output.slice(0, 500));
      throw e;
    }
  }

  // Base64 이미지 데이터를 부분 파트로 변환하는 유틸리티 메서드
  private async createPartsFromUrls(urls: string[]): Promise<any[]> {
    // NOTE: 실 환경에서는 URL에서 직접 이미지를 다운로드 받아 base64로 
    // 인코딩하는 과정이 필요합니다. playwright를 이용해 이미지를 다운로딩 하거나
    // fetch로 ArrayBuffer를 이용해 인코딩해야합니다. 이 예시 구현은
    // 로컬 스크래핑을 통한 데이터베이스 주입을 가정합니다.

    const parts = [];
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.instagram.com/',
            'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          },
        });
        if (!res.ok) {
          console.log(`[Gemini] Image fetch failed (${res.status}):`, url.slice(0, 80));
          continue;
        }

        const buffer = await res.arrayBuffer();
        const mime = res.headers.get('content-type') || 'image/jpeg';
        const base64 = Buffer.from(buffer).toString('base64');

        parts.push({
          inlineData: {
            data: base64,
            mimeType: mime
          }
        });
      } catch (e) {
        console.log('[Gemini] Failed to fetch image:', url.slice(0, 80));
      }
    }
    console.log(`[Gemini] Images loaded: ${parts.length}/${urls.length}`);
    return parts;
  }

  async analyzeVisuals(imageData: { base64: string; mimeType: string }[]): Promise<VisualAnalysis> {
    console.log('[AI] Starting Visual Analysis...');
    const imageParts = imageData.slice(0, 9).map(({ base64, mimeType }) => ({
      inlineData: { data: base64, mimeType },
    }));
    console.log(`[AI] Image parts ready: ${imageParts.length}`);
    const visualPrompt = VISUAL_ANALYSIS_PROMPT.replace(/\[IMAGE_COUNT_PLACEHOLDER\]/g, imageParts.length.toString());

    if (imageParts.length === 0) {
      console.log('[AI] No images available, skipping visual analysis.');
      return {
        feed_tone: { palette: '', saturation: '', brightness: '', filter_consistency: '' },
        content_types: { primary_subjects: [], person_frequency: '', product_style: '' },
        composition: { dominant_patterns: [], whitespace: '', text_overlay: '' },
        grid_strategy: { has_pattern: false, pattern_description: '', content_ratio: { single_image: 0, carousel: 0, reels: 0 } },
        visual_identity: { score: 0, recognizability: '' },
        summary: '이미지 데이터를 수집하지 못해 비주얼 분석을 진행할 수 없습니다.',
      };
    }

    const response = await this.withRetry(() => this.ai_client.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: [
        { role: 'user', parts: [...imageParts, { text: visualPrompt }] }
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
      }
    }));

    const output = response.text;
    if (!output) throw new Error("Empty AI response");

    return this.parseJsonResponse<VisualAnalysis>(output);
  }

  async analyzeCaptions(captions: string[]): Promise<CaptionAnalysis> {
    console.log('[AI] Starting Caption Analysis...');
    const basePrompt = captions.length < 5 ? CAPTION_ANALYSIS_PROMPT_SHORT : CAPTION_ANALYSIS_PROMPT;
    const prompt = basePrompt.replace('[CAPTIONS_PLACEHOLDER]', captions.join('\n\n---\n\n'));

    const response = await this.withRetry(() => this.ai_client.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
      }
    }));

    const output = response.text;
    if (!output) throw new Error("Empty AI response");

    return this.parseJsonResponse<CaptionAnalysis>(output);
  }

  private compressVisualAnalysis(visuals: VisualAnalysis) {
    return {
      palette: visuals.feed_tone?.palette,
      visual_identity_score: visuals.visual_identity?.score,
      content_ratio: visuals.grid_strategy?.content_ratio,
      dominant_patterns: visuals.composition?.dominant_patterns,
      summary: visuals.summary,
    };
  }

  private compressForMetaAnalysis(data: FullAnalysisData) {
    const posts = data.posts ?? [];
    const avgLikes = posts.length > 0
      ? Math.round(posts.reduce((a, p) => a + (p.likes_count ?? 0), 0) / posts.length) : 0;
    const followers = data.profile?.followers_count ?? 0;
    const engagementRate = followers > 0 ? parseFloat((avgLikes / followers * 100).toFixed(2)) : 0;

    const topPosts = [...posts]
      .sort((a, b) => (b.likes_count ?? 0) - (a.likes_count ?? 0))
      .slice(0, 5)
      .map(p => ({
        likes_count: p.likes_count ?? 0,
        caption_preview: (p.caption ?? '').slice(0, 50),
        image_url: p.image_urls?.[0] ?? null,
        is_reel: p.is_reel,
        is_carousel: p.is_carousel,
      }));

    const v = data.visuals ?? {};
    const c = data.captions ?? ({} as CaptionAnalysis);

    return {
      username: data.profile?.username,
      followers,
      avg_likes: avgLikes,
      engagement_rate: engagementRate,
      visual: {
        palette: v.feed_tone?.palette,
        dominant_patterns: v.composition?.dominant_patterns,
        visual_identity_score: v.visual_identity?.score,
        content_ratio: v.grid_strategy?.content_ratio,
      },
      caption: {
        speech_style: c.tone_manner?.speech_style,
        hook_style: c.caption_strategy?.hook_style ?? (c as any).hook_style?.primary_hook,
        cta_pattern: c.engagement_style?.cta_pattern,
        top_themes: c.content_categories?.top_themes,
        hashtag_examples: (c.hashtag_strategy?.examples ?? []).slice(0, 5),
      },
      top_posts: topPosts,
    };
  }

  private compressCaptionAnalysis(captions: CaptionAnalysis) {
    return {
      speech_style: captions.tone_manner?.speech_style,
      top_themes: captions.content_categories?.top_themes,
      hashtag_types: captions.hashtag_strategy?.types,
      engagement_style: captions.engagement_style,
      summary: captions.summary,
    };
  }

  async generateAccountReport(data: FullAnalysisData): Promise<AccountReport> {
    console.log('[AI] Synthesizing Final Report...');

    const captions = data.posts.map(p => p.caption).filter(Boolean) as string[];

    // 해시태그 통계 계산
    const hashtagCounts = captions.map(c => (c.match(/#[\w가-힣]+/g) || []).length);
    const avgHashtagCount = hashtagCounts.length > 0
      ? Math.round(hashtagCounts.reduce((a, b) => a + b, 0) / hashtagCounts.length)
      : 0;
    const placementVotes = captions.map(c => {
      const lastIdx = c.lastIndexOf('#');
      if (lastIdx === -1) return null;
      return lastIdx / c.length > 0.7 ? '마지막' : '본문 혼합';
    }).filter(Boolean) as string[];
    const hashtagPlacement = placementVotes.length === 0
      ? '데이터 없음'
      : placementVotes.filter(p => p === '마지막').length >= placementVotes.length / 2
        ? '마지막'
        : '본문 혼합';

    const totalLikes = data.posts.reduce((acc, p) => acc + p.likes_count, 0);
    const totalComments = data.posts.reduce((acc, p) => acc + p.comments_count, 0);
    const avgCaptionLength = captions.length > 0
      ? Math.round(captions.reduce((acc, c) => acc + c.length, 0) / captions.length)
      : 0;

    // 인게이지먼트율 계산 (팔로워 수 대비 평균 좋아요)
    const avgLikes = Math.round(totalLikes / data.posts.length) || 0;
    const followers = data.profile.followers_count || 0;
    const engagementRate = followers > 0
      ? parseFloat((avgLikes / followers * 100).toFixed(2))
      : null;

    // 포맷별 평균 인게이지먼트 계산
    const reels = data.posts.filter(p => p.is_reel);
    const carousels = data.posts.filter(p => !p.is_reel && p.is_carousel);
    const singles = data.posts.filter(p => !p.is_reel && !p.is_carousel);
    const avgByFormat = (posts: typeof data.posts) =>
      posts.length > 0 ? Math.round(posts.reduce((acc, p) => acc + p.likes_count, 0) / posts.length) : null;
    const formatEngagement = {
      reels: { count: reels.length, avg_likes: avgByFormat(reels) },
      carousel: { count: carousels.length, avg_likes: avgByFormat(carousels) },
      single: { count: singles.length, avg_likes: avgByFormat(singles) },
    };

    // 상위/하위 퍼포머 분리 (상위 20%, 하위 20%)
    const sortedByLikes = [...data.posts].sort((a, b) => b.likes_count - a.likes_count);
    const topCount = Math.max(1, Math.ceil(data.posts.length * 0.2));
    const lowCount = Math.max(1, Math.ceil(data.posts.length * 0.2));
    const topPerformers = sortedByLikes.slice(0, topCount).map(p => ({
      likes_count: p.likes_count,
      is_reel: p.is_reel,
      is_carousel: p.is_carousel,
      caption_preview: p.caption ? p.caption.slice(0, 80) : '',
      hashtag_count: (p.caption?.match(/#[\w가-힣]+/g) || []).length,
    }));
    const lowPerformers = sortedByLikes.slice(-lowCount).map(p => ({
      likes_count: p.likes_count,
      is_reel: p.is_reel,
      is_carousel: p.is_carousel,
      caption_preview: p.caption ? p.caption.slice(0, 80) : '',
      hashtag_count: (p.caption?.match(/#[\w가-힣]+/g) || []).length,
    }));

    // 게시물 레벨 페어링 — 상위 5개 이미지+캡션+성과 묶음
    const topPaired = sortedByLikes.slice(0, Math.min(5, sortedByLikes.length)).map(p => ({
      likes_count: p.likes_count,
      comments_count: p.comments_count,
      is_reel: p.is_reel,
      is_carousel: p.is_carousel,
      caption_preview: p.caption ? p.caption.slice(0, 120) : '',
      has_image: (p.image_urls?.length ?? 0) > 0,
    }));

    // 시계열 데이터 — 게시물별 날짜+성과 (posted_at 있는 경우만)
    const postTimeline = data.posts
      .filter(p => p.posted_at)
      .map(p => ({ posted_at: p.posted_at, likes_count: p.likes_count, is_reel: p.is_reel, is_carousel: p.is_carousel }))
      .sort((a, b) => new Date(a.posted_at!).getTime() - new Date(b.posted_at!).getTime());

    const statsRaw = {
      avg_likes: avgLikes,
      avg_comments: Math.round(totalComments / data.posts.length) || 0,
      avg_caption_length_chars: avgCaptionLength,
      avg_hashtag_count: avgHashtagCount,
      hashtag_placement: hashtagPlacement,
      sample_size: data.posts.length,
      engagement_rate: engagementRate,
      format_engagement: formatEngagement,
      top_performers: topPerformers,
      low_performers: lowPerformers,
      top_paired_posts: topPaired,
      post_timeline: postTimeline.length > 0 ? postTimeline : undefined,
    };

    // 1,2단계 결과는 핵심 필드만 압축해서 전달 (컨텍스트 과부하 방지)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { profile_image_data: _pid, ...profileForAI } = data.profile;
    let prompt = FULL_REPORT_PROMPT;
    prompt = prompt.replace('[PROFILE_PLACEHOLDER]', JSON.stringify(profileForAI, null, 2));
    prompt = prompt.replace('[VISUAL_PLACEHOLDER]', JSON.stringify(this.compressVisualAnalysis(data.visuals), null, 2));
    prompt = prompt.replace('[CAPTION_PLACEHOLDER]', JSON.stringify(this.compressCaptionAnalysis(data.captions), null, 2));
    prompt = prompt.replace('[STATS_PLACEHOLDER]', JSON.stringify(statsRaw, null, 2));

    const response = await this.withRetry(() => this.ai_client.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
      }
    }));

    const output = response.text;
    if (!output) throw new Error("Empty AI response");

    return this.parseJsonResponse<AccountReport>(output);
  }

  async discoverAccounts(promptText: string, userContext?: string, previousAccounts?: string[]): Promise<any> {
    console.log('[AI] Discovering accounts for prompt:', promptText);

    const contextSection = userContext
      ? `## 내 계정 목표 (맥락)\n${userContext}\n이 맥락을 반영하여 가장 관련성 높은 계정을 추천하세요.\n대형/소형 계정 비율도 이 목표에 맞게 조정하세요.`
      : '';

    const excludeSection = previousAccounts && previousAccounts.length > 0
      ? `## 제외할 계정 (이미 분석 완료)\n${previousAccounts.join(', ')}\n위 계정들은 반드시 제외하고 새로운 계정만 추천하세요.`
      : '';

    const prompt = DISCOVERY_PROMPT
      .replace('[USER_PROMPT_PLACEHOLDER]', promptText)
      .replace('[USER_CONTEXT_PLACEHOLDER]', contextSection)
      .replace('[PREVIOUS_ACCOUNTS_PLACEHOLDER]', excludeSection);

    const response = await this.ai_client.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
      }
    });

    const output = response.text;
    if (!output) throw new Error("Empty AI response");

    try {
      return this.parseJsonResponse<any>(output);
    } catch (e) {
      console.error('[AI] Failed to parse JSON:', output);
      throw new Error("AI가 유효하지 않은 응답을 반환했습니다.");
    }
  }

  async generateAgenticReport(promptText: string, scrapedData: FullAnalysisData[]): Promise<AgentReport> {
    console.log('[AI] Synthesizing Agentic Final Report for prompt:', promptText);

    // We only need relevant parts of the scraped data to avoid token limits with multiple accounts.
    // 먼저 각 계정의 인게이지먼트율과 비주얼 점수를 계산
    const accountStats = scrapedData.map(data => {
      const avgLikes = Math.round(data.posts.reduce((acc, p) => acc + p.likes_count, 0) / data.posts.length) || 0;
      const followers = data.profile.followers_count || 0;
      const engagementRate = followers > 0 ? parseFloat((avgLikes / followers * 100).toFixed(2)) : 0;
      const visualScore = data.visuals?.visual_identity?.score ?? 0;
      return { username: data.profile.username, avgLikes, engagementRate, visualScore };
    });

    // 인게이지먼트율 기준 순위 계산 (1위 = 가장 높음)
    const sortedByEngagement = [...accountStats].sort((a, b) => b.engagementRate - a.engagementRate);
    const sortedByVisual = [...accountStats].sort((a, b) => b.visualScore - a.visualScore);
    const engagementRankMap = new Map(sortedByEngagement.map((s, i) => [s.username, i + 1]));
    const visualRankMap = new Map(sortedByVisual.map((s, i) => [s.username, i + 1]));

    const optimizedData = scrapedData.map(data => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { profile_image_data: _pid, ...profileInfo } = data.profile;
      const avgLikes = Math.round(data.posts.reduce((acc, p) => acc + p.likes_count, 0) / data.posts.length) || 0;
      const avgComments = Math.round(data.posts.reduce((acc, p) => acc + p.comments_count, 0) / data.posts.length) || 0;
      const followers = data.profile.followers_count || 0;
      const engagementRate = followers > 0 ? parseFloat((avgLikes / followers * 100).toFixed(2)) : 0;
      return {
        username: data.profile.username,
        profile_info: profileInfo,
        visual_features: this.compressVisualAnalysis(data.visuals),
        caption_features: this.compressCaptionAnalysis(data.captions),
        recent_engagement: {
          avg_likes: avgLikes,
          avg_comments: avgComments,
          engagement_rate: engagementRate,
          engagement_rank: `${engagementRankMap.get(data.profile.username)}/${scrapedData.length}위`,
          visual_score_rank: `${visualRankMap.get(data.profile.username)}/${scrapedData.length}위`,
        }
      };
    });

    let prompt = AGENT_SYNTHESIS_PROMPT;
    prompt = prompt.replace('[USER_PROMPT_PLACEHOLDER]', promptText);
    prompt = prompt.replace('[SCRAPED_DATA_PLACEHOLDER]', JSON.stringify(optimizedData, null, 2));

    const response = await this.ai_client.models.generateContent({
      model: 'gemini-3.1-pro-preview', // Use pro for complex synthesis
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
      }
    });

    const output = response.text;
    if (!output) throw new Error("Empty AI response");

    return this.parseJsonResponse<AgentReport>(output);
  }

  async generateMetaReport(sessions: MetaSession[]): Promise<AgentReport> {
    // 세션별 요약 정보
    const sessionInfo = sessions.map((s, i) => ({
      session: i + 1,
      prompt: s.prompt,
      analyzed_at: s.analyzed_at,
      account_count: s.accounts.length,
    }));

    // 중복 계정 제거 후 전체 계정 목록 구성
    const seenUsernames = new Set<string>();
    const allAccounts: FullAnalysisData[] = [];
    for (const session of sessions) {
      for (const acc of session.accounts) {
        const uname = acc.profile?.username;
        if (uname && !seenUsernames.has(uname)) {
          seenUsernames.add(uname);
          allAccounts.push(acc);
        }
      }
    }

    const compressedData = allAccounts.map(acc => this.compressForMetaAnalysis(acc));
    const totalAccounts = allAccounts.length;

    let prompt = META_SYNTHESIS_PROMPT;
    prompt = prompt.replace('[META_SESSIONS_PLACEHOLDER]', JSON.stringify(sessionInfo, null, 2));
    prompt = prompt.replace('[SCRAPED_DATA_PLACEHOLDER]', JSON.stringify(compressedData, null, 2));
    prompt = prompt.replace(/\[SESSION_COUNT\]/g, String(sessions.length));
    prompt = prompt.replace(/\[TOTAL_ACCOUNTS\]/g, String(totalAccounts));

    const response = await this.ai_client.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      },
    });

    const output = response.text;
    if (!output) throw new Error('Empty AI response');

    return this.parseJsonResponse<AgentReport>(output);
  }
}
