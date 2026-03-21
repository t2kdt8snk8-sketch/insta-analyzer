import { Browser, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const SESSION_PATH = path.resolve(process.cwd(), '.sessions/instagram.json');

export class SessionExpiredError extends Error {
  constructor(message = '세션이 만료되었거나 존재하지 않습니다. 터미널에서 로컬 로그인을 진행해주세요.') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

// 스크래핑 시 호출되는 공통 컨텍스트 생성 함수
export async function getAuthenticatedContext(browser: Browser): Promise<BrowserContext> {
  if (!fs.existsSync(SESSION_PATH)) {
    throw new SessionExpiredError();
  }

  // 1. 기존 세션으로 컨텍스트 생성
  const context = await browser.newContext({ storageState: SESSION_PATH });
  const page = await context.newPage();

  // 2. 세션 만료 여부를 플래그로 추적 (이벤트 핸들러 내 throw는 언캐치 예외 유발)
  let sessionExpired = false;
  page.on('response', (response) => {
    if (response.status() === 302 && response.headers()['location']?.includes('accounts/login')) {
      sessionExpired = true;
    }
  });

  // 3. 실제 페이지 테스트 시 만료 페이지로 갔는지 확인
  await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });
  const currentUrl = page.url();

  if (sessionExpired || currentUrl.includes('accounts/login')) {
    await context.close();
    throw new SessionExpiredError();
  }

  await page.close(); // 테스트용 페이지 닫기
  return context;     // 검증된 컨텍스트 반환
}
