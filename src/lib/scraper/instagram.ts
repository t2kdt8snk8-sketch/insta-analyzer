import { chromium } from 'playwright';
import { getAuthenticatedContext } from './session';
import { ScrapedPost, ScrapedProfile } from './types';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─── Helpers ───────────────────────────────────────────────────────────────

function parseNumber(raw: string | null | undefined): number {
  if (!raw) return 0;
  const s = raw.replace(/,/g, '').trim();
  if (s.includes('만')) return Math.round(parseFloat(s) * 10_000);
  if (s.includes('억')) return Math.round(parseFloat(s) * 100_000_000);
  if (/k$/i.test(s)) return Math.round(parseFloat(s) * 1_000);
  if (/m$/i.test(s)) return Math.round(parseFloat(s) * 1_000_000);
  return parseInt(s.replace(/\D/g, ''), 10) || 0;
}

function waitForApiResponse(
  page: any,
  urlMatch: (url: string) => boolean,
  dataMatch: (json: any) => boolean,
  timeoutMs = 15_000,
): Promise<any> {
  return new Promise((resolve) => {
    let done = false;

    const finish = (value: any) => {
      if (done) return;
      done = true;
      page.off('response', handler);
      resolve(value);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    const handler = async (res: any) => {
      if (done) return;
      if (!urlMatch(res.url())) return;
      try {
        const json = await res.json();
        if (dataMatch(json)) {
          clearTimeout(timer);
          finish(json);
        }
      } catch {}
    };

    page.on('response', handler);
  });
}

// ─── Download images using Playwright browser session (has Instagram cookies) ──

async function downloadImagesViaPlaywright(
  page: any,
  urls: string[],
  maxImages = 2,
): Promise<{ base64: string; mimeType: string }[]> {
  const results: { base64: string; mimeType: string }[] = [];
  for (const url of urls.slice(0, maxImages)) {
    try {
      const res = await page.context().request.get(url, {
        headers: { 'Referer': 'https://www.instagram.com/' },
      });
      if (!res.ok()) continue;
      const buf: Buffer = await res.body();
      const mimeType: string = res.headers()['content-type'] || 'image/jpeg';
      results.push({ base64: buf.toString('base64'), mimeType });
    } catch {}
  }
  return results;
}

// ─── Build posts from xdt_api__v1__feed__user_timeline_graphql_connection ──
// 실제 확인된 응답 구조: edges[i].node = 미디어 객체
// node.like_count, node.comment_count, node.media_type (1=사진, 2=영상, 8=캐러셀)
// node.image_versions2.candidates[0].url = 이미지 URL
// node.carousel_media[].image_versions2.candidates[0].url = 캐러셀 이미지들
// node.caption.text = 캡션
// node.code = shortcode

async function postsFromTimelineEdges(
  page: any,
  edges: any[],
  maxPosts: number,
): Promise<ScrapedPost[]> {
  const posts: ScrapedPost[] = [];

  for (const edge of edges.slice(0, maxPosts)) {
    const n = edge.node;
    if (!n) continue;

    const isCarousel = n.media_type === 8 || !!(n.carousel_media?.length);
    const isReel = n.media_type === 2;
    const code: string = n.code ?? '';

    // 이미지 URL 추출
    let imageUrls: string[];
    if (isCarousel) {
      imageUrls = (n.carousel_media ?? [])
        .slice(0, 5)
        .map((m: any) => m.image_versions2?.candidates?.[0]?.url)
        .filter(Boolean);
    } else {
      imageUrls = [n.image_versions2?.candidates?.[0]?.url].filter(Boolean) as string[];
    }

    const caption: string = n.caption?.text ?? '';
    const hashtags = (caption.match(/#[^\s#]+/g) ?? []).map((t) => t.trim());

    // 이미지 다운로드 (AI 비주얼 분석용)
    const imageData = await downloadImagesViaPlaywright(page, imageUrls);

    posts.push({
      post_url: isReel
        ? `https://www.instagram.com/reel/${code}/`
        : `https://www.instagram.com/p/${code}/`,
      image_urls: imageUrls,
      image_data: imageData.length > 0 ? imageData : undefined,
      caption,
      hashtags,
      likes_count: n.like_count ?? 0,
      comments_count: n.comment_count ?? 0,
      posted_at: n.taken_at ? new Date(n.taken_at * 1000).toISOString() : undefined,
      is_reel: isReel,
      is_carousel: isCarousel,
    });
  }

  return posts;
}

// ─── Main entry point ─────────────────────────────────────────────────────

export async function scrapeProfileAndPosts(
  username: string,
  maxPosts = 12,
): Promise<{ profile: ScrapedProfile; posts: ScrapedPost[] }> {
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await getAuthenticatedContext(browser);
    const page = await context.newPage();

    // 프로필 페이지에서 두 개의 응답을 동시에 인터셉트
    // 1. 프로필 정보 (follower_count 등)
    const profileApiPromise = waitForApiResponse(
      page,
      (url) => url.includes('/graphql'),
      (json) => json?.data?.user?.follower_count != null,
      15_000,
    );
    // 2. 포스트 목록 (좋아요, 댓글, 캡션, 이미지 URL 포함)
    const timelineApiPromise = waitForApiResponse(
      page,
      (url) => url.includes('/graphql'),
      (json) => json?.data?.xdt_api__v1__feed__user_timeline_graphql_connection?.edges != null,
      20_000,
    );

    console.log(`[Scraper] → @${username}`);
    await page.goto(`https://www.instagram.com/${username}/`, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    });

    const [profileApiData, timelineApiData] = await Promise.all([
      profileApiPromise,
      timelineApiPromise,
    ]);

    if (profileApiData?.data?.user) {
      const user = profileApiData.data.user;

      const profile: ScrapedProfile = {
        username,
        full_name: user.full_name ?? '',
        bio: user.biography ?? '',
        followers_count: user.follower_count ?? 0,
        following_count: user.following_count ?? 0,
        posts_count: user.media_count ?? 0,
        profile_image_url: user.hd_profile_pic_url_info?.url ?? user.profile_pic_url ?? '',
        is_verified: user.is_verified ?? false,
      };

      console.log(`[Scraper] ✓ 프로필 — ${profile.followers_count} followers`);

      // 타임라인 API 성공 → 포스트 목록 직접 추출 (개별 페이지 방문 불필요)
      const edges = timelineApiData?.data?.xdt_api__v1__feed__user_timeline_graphql_connection?.edges ?? [];
      if (edges.length > 0) {
        console.log(`[Scraper] ✓ 타임라인 API — ${edges.length}개 포스트 데이터 수신`);
        const posts = await postsFromTimelineEdges(page, edges, maxPosts);
        console.log(`[Scraper] ✓ 포스트 처리 완료 — ${posts.length}개`);
        return { profile, posts };
      }

      // 타임라인 API 실패 시 DOM으로 포스트 URL 수집 후 개별 방문 (fallback)
      console.log(`[Scraper] 타임라인 API 실패 — DOM fallback`);
      try {
        await page.waitForLoadState('load', { timeout: 15_000 });
      } catch {}
      await delay(3_000);
      const posts = await collectPostsFromPage(page, maxPosts);
      console.log(`[Scraper] ✓ DOM posts — ${posts.length}개`);
      return { profile, posts };
    }

    // 프로필 API 인터셉트 실패 시 전체 DOM fallback
    console.log(`[Scraper] 프로필 API 실패 — DOM fallback for @${username}`);
    return await domFallback(page, username, maxPosts);
  } finally {
    await browser.close();
  }
}

// ─── DOM fallback: 포스트 URL 수집 후 개별 페이지 방문 ────────────────────

async function collectPostsFromPage(page: any, maxPosts: number): Promise<ScrapedPost[]> {
  try {
    await page.waitForSelector('a[href*="/p/"], a[href*="/reel/"]', { timeout: 10_000 });
  } catch {
    console.log('[Scraper] Post grid not found within timeout');
  }

  const postUrls = new Set<string>();
  let prevHeight = 0;

  for (let i = 0; i < 8 && postUrls.size < maxPosts; i++) {
    const links: string[] = await page.$$eval(
      'a[href]',
      (els: HTMLAnchorElement[]) =>
        els.map((el) => el.href).filter((h) => h.includes('/p/') || h.includes('/reel/')),
    );
    links.forEach((l) => {
      if (/instagram\.com\/[^/]+\/(p|reel)\/[A-Za-z0-9_-]+\/?$/.test(l)) postUrls.add(l);
    });
    if (postUrls.size >= maxPosts) break;

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await delay(1_500);
    const h: number = await page.evaluate(() => document.body.scrollHeight);
    if (h === prevHeight) break;
    prevHeight = h;
  }

  console.log(`[Scraper] Found ${postUrls.size} post URLs`);

  const posts: ScrapedPost[] = [];
  for (const url of Array.from(postUrls).slice(0, maxPosts)) {
    const post = await scrapePostPageDOM(page, url);
    if (post) posts.push(post);
  }
  return posts;
}

// ─── DOM fallback (profile page) ──────────────────────────────────────────

async function domFallback(
  page: any,
  username: string,
  maxPosts: number,
): Promise<{ profile: ScrapedProfile; posts: ScrapedPost[] }> {
  try {
    await page.waitForSelector('header', { timeout: 8_000 });
  } catch {}
  await delay(2_000);

  const raw = await page.evaluate(() => {
    const header = document.querySelector('header');
    const items = Array.from(header?.querySelectorAll('ul li') ?? []);
    const statText = (el: Element | undefined) =>
      el?.querySelector('[title]')?.getAttribute('title') ??
      el?.querySelector('span')?.textContent ??
      '0';

    return {
      full_name: (header?.querySelector('h1, h2')?.textContent ?? '').trim(),
      bio: (document.querySelector('header section span[dir]')?.textContent ?? '').trim(),
      posts_count: statText(items[0]),
      followers_count: statText(items[1]),
      following_count: statText(items[2]),
      profile_image_url: header?.querySelector('img')?.getAttribute('src') ?? '',
      is_verified: !!(document.querySelector(
        'header [aria-label*="인증"], header [aria-label*="Verified"], header [aria-label*="verified"]',
      )),
    };
  });

  const profile: ScrapedProfile = {
    username,
    full_name: raw.full_name,
    bio: raw.bio,
    followers_count: parseNumber(raw.followers_count),
    following_count: parseNumber(raw.following_count),
    posts_count: parseNumber(raw.posts_count),
    profile_image_url: raw.profile_image_url,
    is_verified: raw.is_verified,
  };

  const posts = await collectPostsFromPage(page, maxPosts);
  return { profile, posts };
}

// ─── DOM fallback (개별 포스트 페이지) ─────────────────────────────────────

async function scrapePostPageDOM(
  page: any,
  url: string,
): Promise<ScrapedPost | null> {
  const isReel = url.includes('/reel/');

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  } catch {
    return null;
  }
  await delay(1_500);

  try {
    const moreSelectors = [
      'span[role="button"]:has-text("더 보기")',
      'span[role="button"]:has-text("more")',
      'button:has-text("더 보기")',
    ];
    for (const sel of moreSelectors) {
      const btn = await page.$(sel);
      if (btn) { await btn.click(); await delay(400); break; }
    }
  } catch {}

  const data = await page.evaluate(() => {
    const article = document.querySelector('article') ?? document.body;

    const h1 = article.querySelector('h1')?.textContent?.trim() ?? '';
    let caption = '';
    if (h1.length > 20) {
      caption = h1;
    } else {
      const dirSpans = Array.from(article.querySelectorAll('span[dir="auto"]'));
      const longest = dirSpans.reduce(
        (a, b) => (b.textContent?.length ?? 0) > (a.textContent?.length ?? 0) ? b : a,
        dirSpans[0] ?? document.createElement('span'),
      );
      const raw = longest?.textContent?.trim() ?? '';
      caption = raw.replace(/^[\s\S]*?(?:\d+[wdhmsy])\s*\u00a0?\s*/, '').trim() || raw;
    }

    const imgs = Array.from(article.querySelectorAll('img'))
      .filter((img) => (img as HTMLImageElement).naturalWidth > 150 || (img as HTMLImageElement).width > 150)
      .map((img) => img.getAttribute('src'))
      .filter(Boolean) as string[];

    // 캐러셀: article 내부 미디어 영역만 체크 (페이지 이동 버튼과 혼동 방지)
    const mediaDiv = article.querySelector('div[role="presentation"]') ?? article;
    const isCarousel = Array.from(mediaDiv.querySelectorAll('button[aria-label]'))
      .some((btn) => /next|다음/i.test(btn.getAttribute('aria-label') ?? ''))
      || imgs.length > 1;

    const allText = document.body.innerText;
    let likes = 0;
    for (const pat of [/(\d[\d,]*)\s*명이 좋아/, /좋아요\s*(\d[\d,]*)/, /(\d[\d,]*)\s*likes?/i]) {
      const m = allText.match(pat);
      if (m) { likes = parseInt(m[1].replace(/,/g, ''), 10); if (likes > 0) break; }
    }
    let comments = 0;
    for (const pat of [/댓글\s*(\d[\d,]*)\s*개/, /view all\s*(\d[\d,]*)\s*comments?/i, /(\d[\d,]*)\s*comments?/i]) {
      const m = allText.match(pat);
      if (m) { comments = parseInt(m[1].replace(/,/g, ''), 10); if (comments > 0) break; }
    }

    return { caption, image_urls: imgs.slice(0, 5), is_carousel: isCarousel, likes_count: likes, comments_count: comments };
  });

  const hashtags = (data.caption.match(/#[^\s#]+/g) ?? []).map((t: string) => t.trim());
  const imageData = await downloadImagesViaPlaywright(page, data.image_urls);

  return {
    post_url: url,
    image_urls: data.image_urls,
    image_data: imageData.length > 0 ? imageData : undefined,
    caption: data.caption,
    hashtags,
    likes_count: data.likes_count,
    comments_count: data.comments_count,
    is_reel: isReel,
    is_carousel: data.is_carousel,
  };
}
