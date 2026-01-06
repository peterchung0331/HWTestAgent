import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// ES 모듈에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env 파일 로드
dotenv.config();

const GOOGLE_EMAIL = process.env.GOOGLE_TEST_EMAIL || '';
const GOOGLE_PASSWORD = process.env.GOOGLE_TEST_PASSWORD || '';
const BASE_URL = process.env.TEST_URL_ORACLE || 'https://workhub.biz';
const SCREENSHOT_DIR = path.join(__dirname, '../test-results/MyTester/screenshots', `${new Date().toISOString().split('T')[0]}-oracle-e2e`);

// 스크린샷 디렉토리 생성
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('HubManager E2E Base Test - Google OAuth + Hub Navigation', () => {
  test.setTimeout(180000); // 3분 타임아웃

  test('Google OAuth 로그인 및 Hub 네비게이션 테스트', async ({ page }) => {
    console.log('🚀 Starting HubManager E2E Base Test...');
    console.log(`📍 Base URL: ${BASE_URL}`);
    console.log(`🔑 Google Email: ${GOOGLE_EMAIL}`);

    // 1. HubManager 홈페이지 접속
    console.log('\n📊 Step 1: Accessing HubManager homepage...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-hubmanager-home.png'), fullPage: true });
    console.log('✅ HubManager homepage loaded');

    // 2. 로그인 페이지 확인
    console.log('\n📊 Step 2: Checking login page...');
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    // 로그인 페이지인지 확인
    const isLoginPage = currentUrl.includes('/login') || await page.locator('text=Google로 로그인').isVisible().catch(() => false);

    if (isLoginPage) {
      console.log('🔓 Login page detected, proceeding with Google OAuth...');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-login-page.png'), fullPage: true });

      // Google 로그인 버튼 클릭
      console.log('🔍 Looking for Google login button...');
      const googleButton = page.locator('button:has-text("Google"), a:has-text("Google")').first();
      await googleButton.waitFor({ timeout: 10000 });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-before-google-click.png'), fullPage: true });

      await googleButton.click();
      console.log('✅ Google login button clicked');

      // Google 로그인 페이지 대기
      console.log('⏳ Waiting for Google login page...');
      await page.waitForURL('**/accounts.google.com/**', { timeout: 30000 });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-google-login-page.png'), fullPage: true });

      // 이메일 입력
      console.log('📧 Entering email...');
      await page.waitForSelector('input[type="email"]', { timeout: 20000 });
      await page.fill('input[type="email"]', GOOGLE_EMAIL);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-email-entered.png'), fullPage: true });

      await page.click('button:has-text("다음"), #identifierNext');
      console.log('✅ Email entered, clicked next');

      // 비밀번호 입력
      console.log('🔑 Entering password...');
      await page.waitForSelector('input[type="password"]', { timeout: 20000 });
      await page.fill('input[type="password"]', GOOGLE_PASSWORD);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-password-entered.png'), fullPage: true });

      await page.click('button:has-text("다음"), #passwordNext');
      console.log('✅ Password entered, clicked next');

      // OAuth 완료 대기 (HubManager로 리다이렉트)
      console.log('⏳ Waiting for OAuth callback...');
      await page.waitForURL(`${BASE_URL}/**`, { timeout: 60000 });
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-oauth-callback.png'), fullPage: true });
      console.log('✅ OAuth callback completed');
    } else {
      console.log('✅ Already logged in, skipping Google OAuth');
    }

    // 3. 쿠키 확인
    console.log('\n📊 Step 3: Checking session cookies...');
    const cookies = await page.context().cookies();
    console.log('🍪 Cookies:', cookies.map(c => `${c.name}=${c.value.substring(0, 20)}...`).join(', '));

    const sessionCookie = cookies.find(c => c.name === 'wbhub.sid');
    const accessTokenCookie = cookies.find(c => c.name === 'wbhub_access_token');

    if (sessionCookie) {
      console.log('✅ Session cookie (wbhub.sid) found');
    } else {
      console.log('❌ Session cookie (wbhub.sid) NOT found');
    }

    if (accessTokenCookie) {
      console.log('✅ Access token cookie found');
    } else {
      console.log('❌ Access token cookie NOT found');
    }

    // 4. Hubs 페이지 접근
    console.log('\n📊 Step 4: Accessing /hubs page...');
    await page.goto(`${BASE_URL}/hubs`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-hubs-page.png'), fullPage: true });

    // 페이지 타이틀 확인
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);

    // URL 확인
    const hubsUrl = page.url();
    console.log(`📍 Current URL: ${hubsUrl}`);

    // unknown_status 에러 체크
    if (hubsUrl.includes('error=unknown_status')) {
      console.log('❌ ERROR: unknown_status detected in URL');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-error-unknown-status.png'), fullPage: true });
      throw new Error('unknown_status error detected - session cookie issue');
    }

    // 5. Sales Hub 버튼 찾기 및 클릭
    console.log('\n📊 Step 5: Looking for Sales Hub button...');
    await page.waitForSelector('text=Sales Hub', { timeout: 20000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-before-saleshub-click.png'), fullPage: true });

    const salesHubButton = page.locator('text=Sales Hub').first();
    await salesHubButton.click();
    console.log('✅ Sales Hub button clicked');

    // 6. Google 로그인 페이지 확인 및 자동 로그인
    console.log('\n📊 Step 6: Checking if Google login is required...');

    try {
      // Google 로그인 페이지로 리다이렉트되었는지 확인 (5초 대기)
      await page.waitForURL('**/accounts.google.com/**', { timeout: 5000 });
      console.log('🔓 Google login page detected, performing automatic login...');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11-google-login-detected.png'), fullPage: true });

      // 이메일 입력
      console.log('📧 Entering email...');
      await page.waitForSelector('input[type="email"]', { timeout: 20000 });
      await page.fill('input[type="email"]', GOOGLE_EMAIL);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12-email-entered.png'), fullPage: true });

      // "다음" 버튼 클릭 (여러 셀렉터 시도)
      const nextButton1 = page.locator('#identifierNext').first();
      const nextButton2 = page.locator('button:has-text("Next")').first();
      const nextButton3 = page.locator('button:has-text("다음")').first();

      if (await nextButton1.isVisible().catch(() => false)) {
        await nextButton1.click();
      } else if (await nextButton2.isVisible().catch(() => false)) {
        await nextButton2.click();
      } else {
        await nextButton3.click();
      }
      console.log('✅ Email entered, clicked next');

      // 비밀번호 입력
      console.log('🔑 Entering password...');
      await page.waitForSelector('input[type="password"]', { timeout: 20000 });
      await page.fill('input[type="password"]', GOOGLE_PASSWORD);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13-password-entered.png'), fullPage: true });

      // "다음" 버튼 클릭
      const passwordNext1 = page.locator('#passwordNext').first();
      const passwordNext2 = page.locator('button:has-text("Next")').first();
      const passwordNext3 = page.locator('button:has-text("다음")').first();

      if (await passwordNext1.isVisible().catch(() => false)) {
        await passwordNext1.click();
      } else if (await passwordNext2.isVisible().catch(() => false)) {
        await passwordNext2.click();
      } else {
        await passwordNext3.click();
      }
      console.log('✅ Password entered, clicked next');

      // OAuth 콜백 완료 대기
      console.log('⏳ Waiting for OAuth callback...');
      await page.waitForURL(`${BASE_URL}/**`, { timeout: 60000 });
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '14-oauth-callback-complete.png'), fullPage: true });
      console.log('✅ OAuth login completed');
      console.log(`📍 Current URL after OAuth: ${page.url()}`);

    } catch (error: any) {
      console.log(`⚠️  Google login error: ${error.message}`);
      console.log(`📍 Current URL: ${page.url()}`);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '14-oauth-error.png'), fullPage: true });
    }

    // 현재 URL 확인
    const currentUrlAfterLogin = page.url();
    console.log(`📍 Current URL before SalesHub wait: ${currentUrlAfterLogin}`);

    // 이미 SalesHub에 있는지 확인
    if (currentUrlAfterLogin.includes('/saleshub')) {
      console.log('✅ Already on SalesHub page, skipping wait');
    }

    // 7. SalesHub 대시보드 로딩 대기
    console.log('\n📊 Step 7: Waiting for SalesHub dashboard...');
    await page.waitForURL('**/saleshub/**', { timeout: 60000 });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '15-saleshub-dashboard.png'), fullPage: true });

    const salesHubUrl = page.url();
    console.log(`📍 SalesHub URL: ${salesHubUrl}`);

    // 대시보드 요소 확인
    const hasDashboard = await page.locator('h1, h2, [role="main"]').count() > 0;
    if (hasDashboard) {
      console.log('✅ SalesHub dashboard loaded successfully');
    } else {
      console.log('⚠️  Dashboard elements not found');
    }

    // 8. 최종 상태 캡처
    console.log('\n📊 Step 8: Capturing final state...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '16-final-state.png'), fullPage: true });

    // 네트워크 요청 로그 (마지막 10개)
    console.log('\n📡 Recent network requests:');
    const requests = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .slice(-10)
        .map((r: any) => ({ name: r.name, duration: r.duration }));
    });
    requests.forEach((r: any) => console.log(`  ${r.name} (${r.duration.toFixed(0)}ms)`));

    console.log('\n✅ E2E Test completed successfully!');
  });
});
