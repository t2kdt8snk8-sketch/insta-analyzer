import { chromium } from 'playwright';
import * as path from 'path';

const SESSION_PATH = path.resolve(process.cwd(), '.sessions/instagram.json');
const TARGET = 'odd33_'; // 테스트할 계정

(async () => {
  const browser = await chromium.launch({ headless: false }); // 브라우저 눈에 보이게 실행
  const context = await browser.newContext({ storageState: SESSION_PATH });
  const page = await context.newPage();

  console.log('=== 네트워크 요청 캡처 시작 ===');

  // 모든 API 관련 요청 URL 출력
  page.on('request', (req) => {
    const url = req.url();
    if (
      url.includes('api') ||
      url.includes('graphql') ||
      url.includes('profile') ||
      url.includes('user') ||
      url.includes('feed') ||
      url.includes('instagram.com/') && req.resourceType() === 'fetch'
    ) {
      console.log('[REQ]', req.method(), url.slice(0, 120));
    }
  });

  // JSON 응답 중 user/profile 데이터가 있는 것만 출력
  page.on('response', async (res) => {
    const url = res.url();
    if (!url.includes('instagram.com')) return;
    if (res.headers()['content-type']?.includes('json')) {
      try {
        const json = await res.json();
        const text = JSON.stringify(json);
        // user 또는 profile 관련 데이터가 있으면 출력
        if (text.includes('follower') || text.includes('biography') || text.includes('media_count')) {
          console.log('\n=== [JSON 응답 발견] ===');
          console.log('URL:', url.slice(0, 150));
          console.log('최상위 키:', Object.keys(json));
          if (json?.data) console.log('data 키:', Object.keys(json.data));
          if (json?.data?.user) {
            const u = json.data.user;
            console.log('\n--- user 객체 키 ---');
            console.log(Object.keys(u));
            console.log('\n--- 팔로워/게시물 관련 ---');
            console.log('follower_count:', u.follower_count);
            console.log('edge_followed_by:', u.edge_followed_by);
            console.log('following_count:', u.following_count);
            console.log('media_count:', u.media_count);
            console.log('edge_owner_to_timeline_media:', u.edge_owner_to_timeline_media?.count, '| edges 수:', u.edge_owner_to_timeline_media?.edges?.length);
          }
        }
      } catch {}
    }
  });

  await page.goto(`https://www.instagram.com/${TARGET}/`, {
    waitUntil: 'networkidle',
    timeout: 30_000,
  });

  console.log('\n=== 페이지 로드 완료, 5초 후 종료 ===');
  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
})();
