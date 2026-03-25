import { NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { getAuthenticatedContext } from '@/lib/scraper/session';
import { SessionExpiredError } from '@/lib/scraper/session';

export const maxDuration = 60;

const NOT_FOUND_MARKERS = [
  "Sorry, this page isn't available",
  "이 페이지를 사용할 수 없습니다",
  "The link you followed may be broken",
];

export async function POST(req: Request) {
  try {
    const { usernames } = await req.json();

    if (!Array.isArray(usernames) || usernames.length === 0) {
      return NextResponse.json({ error: 'usernames array required' }, { status: 400 });
    }

    const browser = await chromium.launch({ headless: true });

    try {
      const context = await getAuthenticatedContext(browser);
      const page = await context.newPage();

      const valid: string[] = [];
      const invalid: string[] = [];

      for (const username of usernames) {
        try {
          await page.goto(`https://www.instagram.com/${username}/`, {
            waitUntil: 'domcontentloaded',
            timeout: 10_000,
          });

          const finalUrl = page.url();
          if (finalUrl.includes('accounts/login') || finalUrl.includes('accounts/suspended')) {
            // 세션 만료 — 남은 계정은 검증 불가, 그냥 valid로 넘김
            for (const remaining of usernames.slice(usernames.indexOf(username))) {
              if (!valid.includes(remaining) && !invalid.includes(remaining)) {
                valid.push(remaining);
              }
            }
            break;
          }

          const pageText = await page.evaluate(() => document.body?.innerText ?? '');

          if (NOT_FOUND_MARKERS.some((m) => pageText.includes(m))) {
            console.log(`[Verify] @${username} — 존재하지 않음`);
            invalid.push(username);
          } else {
            console.log(`[Verify] @${username} — 확인됨`);
            valid.push(username);
          }
        } catch {
          // 타임아웃 등 — 불확실하므로 valid 처리 (분석에서 다시 걸러짐)
          console.log(`[Verify] @${username} — 확인 실패, valid로 처리`);
          valid.push(username);
        }

        // Instagram 과부하 방지 딜레이
        await new Promise((r) => setTimeout(r, 800));
      }

      return NextResponse.json({ valid, invalid });
    } finally {
      await browser.close();
    }
  } catch (err) {
    if (err instanceof SessionExpiredError || (err as Error).name === 'SessionExpiredError') {
      return NextResponse.json({ error: '세션 만료', code: 'SESSION_EXPIRED' }, { status: 401 });
    }
    console.error('[Verify API]', err);
    return NextResponse.json({ error: '계정 확인 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
