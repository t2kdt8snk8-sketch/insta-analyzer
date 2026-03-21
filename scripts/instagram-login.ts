import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const SESSION_DIR = path.resolve(process.cwd(), '.sessions');
const SESSION_PATH = path.join(SESSION_DIR, 'instagram.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function manualLogin() {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }

  console.log('🚀 Instagram 수동 로그인을 준비합니다...');
  
  const browser = await chromium.launch({ headless: false }); 
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('🔐 브라우저가 열렸습니다. Instagram에 로그인해주세요.');
  await page.goto('https://www.instagram.com/accounts/login/');

  console.log('\n---');
  console.log('⚠️  중요: 로그인을 완료하고 피드(메인 화면)가 보이면');
  console.log('   이 터미널 창으로 돌아와 [엔터(Enter)] 키를 눌러주세요.');
  console.log('---\n');

  // 유저가 엔터를 칠 때까지 대기
  await new Promise(resolve => rl.question('로그인을 완료했나요? (Enter 입력 시 세션 저장): ', resolve));

  try {
    // 세션 저장 시점의 상태를 캡처
    await context.storageState({ path: SESSION_PATH });
    console.log(`\n✅ 세션이 성공적으로 저장되었습니다: ${SESSION_PATH}\n`);
  } catch (error) {
    console.error('\n❌ 세션 저장 중 오류 발생:', error);
  } finally {
    rl.close();
    await browser.close();
  }
}

manualLogin();
