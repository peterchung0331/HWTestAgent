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
const BASE_URL = 'http://localhost:3010'; // SalesHub 로컬 포트
const SCREENSHOT_DIR = path.join(__dirname, '../test-results/MyTester/screenshots', `${new Date().toISOString().split('T')[0]}-saleshub-e2e-debug`);

// 스크린샷 디렉토리 생성
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('SalesHub E2E Debug Test - Login Flow', () => {
  test.setTimeout(180000); // 3분 타임아웃

  test('로그인 플로우 디버깅 및 대시보드 접근', async ({ page }) => {
    console.log('🚀 Starting SalesHub E2E Debug Test...');
    console.log(`📍 Base URL: ${BASE_URL}`);
    console.log(`🔑 Google Email: ${GOOGLE_EMAIL}`);

    let retryCount = 0;
    const maxRetries = 5;
    let dashboardReached = false;

    // 네트워크 요청/응답 모니터링
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/') || url.includes('auth') || url.includes('login')) {
        console.log(`📡 [${response.status()}] ${url}`);
        const headers = response.headers();
        if (headers['set-cookie']) {
          console.log(`🍪 Set-Cookie: ${headers['set-cookie']}`);
        }
        if (headers['location']) {
          console.log(`🔀 Redirect to: ${headers['location']}`);
        }
      }
    });

    // 콘솔 에러 모니터링
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ Console Error: ${msg.text()}`);
      }
    });

    while (!dashboardReached && retryCount < maxRetries) {
      retryCount++;
      console.log(`\n🔄 Attempt ${retryCount}/${maxRetries}`);

      try {
        // 1. SalesHub 홈페이지 접속
        console.log('\n📊 Step 1: Accessing SalesHub homepage...');
        await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${retryCount}-01-saleshub-home.png`), fullPage: true });
        console.log('✅ SalesHub homepage loaded');
        console.log(`📍 Current URL: ${page.url()}`);

        // 2. 로그인 버튼 찾기
        console.log('\n📊 Step 2: Looking for login button...');

        // HubManager 로그인 버튼 셀렉터 (Google OAuth)
        const loginSelectors = [
          'button:has-text("HubManager로 로그인")',
          'button:has-text("WB HubManager로 로그인")',
          'button:has-text("Google")',
          'a:has-text("Google")',
          '[href*="/login"]',
          '[href*="/auth"]'
        ];

        let loginButton = null;
        for (const selector of loginSelectors) {
          const element = page.locator(selector).first();
          if (await element.isVisible().catch(() => false)) {
            loginButton = element;
            console.log(`✅ Found login button with selector: ${selector}`);
            break;
          }
        }

        if (!loginButton) {
          console.log('⚠️  No login button found, checking if already logged in...');

          // 이미 로그인되어 있는지 확인
          const isDashboard = page.url().includes('/dashboard') ||
                             await page.locator('h1, h2, [data-testid="dashboard"]').count() > 0;

          if (isDashboard) {
            console.log('✅ Already on dashboard!');
            dashboardReached = true;
            break;
          }

          await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${retryCount}-02-no-login-button.png`), fullPage: true });
          throw new Error('Login button not found');
        }

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${retryCount}-03-before-login-click.png`), fullPage: true });

        // 3. 로그인 버튼 클릭
        console.log('\n📊 Step 3: Clicking login button...');
        await loginButton.click();
        console.log('✅ Login button clicked');

        // 4. 리다이렉트 확인
        console.log('\n📊 Step 4: Checking redirect...');
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        const afterClickUrl = page.url();
        console.log(`📍 URL after login click: ${afterClickUrl}`);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${retryCount}-04-after-login-click.png`), fullPage: true });

        // localhost:3090으로 이동했는지 확인
        if (afterClickUrl.includes('localhost:3090') || afterClickUrl.includes('localhost:4090')) {
          console.log('⚠️  Redirected to HubManager (localhost:3090 or 4090)');
          console.log('🔍 This is expected for SSO flow - continuing...');
        }

        // 5. Google 로그인 페이지 확인
        console.log('\n📊 Step 5: Waiting for Google login or redirect...');

        try {
          // Google 로그인 페이지 대기 (10초)
          await page.waitForURL('**/accounts.google.com/**', { timeout: 10000 });
          console.log('🔓 Google login page detected');
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${retryCount}-05-google-login.png`), fullPage: true });

          // Google 자동 로그인
          console.log('📧 Entering email...');
          await page.waitForSelector('input[type="email"]', { timeout: 20000 });
          await page.fill('input[type="email"]', GOOGLE_EMAIL);
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${retryCount}-06-email-entered.png`), fullPage: true });

          // 다음 버튼 클릭
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
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${retryCount}-07-password-entered.png`), fullPage: true });

          // 다음 버튼 클릭
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

          // OAuth 완료 대기
          console.log('⏳ Waiting for OAuth callback...');
          await page.waitForLoadState('networkidle', { timeout: 60000 });
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${retryCount}-08-oauth-complete.png`), fullPage: true });

        } catch (error: any) {
          console.log(`⚠️  Google login not required or error: ${error.message}`);
          console.log(`📍 Current URL: ${page.url()}`);
        }

        // 6. 대시보드 확인
        console.log('\n📊 Step 6: Checking for dashboard...');
        await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

        const finalUrl = page.url();
        console.log(`📍 Final URL: ${finalUrl}`);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${retryCount}-09-final-page.png`), fullPage: true });

        // 대시보드 요소 확인
        const hasDashboard = await page.locator('h1, h2, [role="main"], [data-testid="dashboard"]').count() > 0;
        const isDashboardUrl = finalUrl.includes('/dashboard') || finalUrl.includes('/saleshub');

        console.log(`🔍 Has dashboard elements: ${hasDashboard}`);
        console.log(`🔍 Is dashboard URL: ${isDashboardUrl}`);

        if (hasDashboard || isDashboardUrl) {
          console.log('✅ Dashboard reached!');
          dashboardReached = true;

          // 최종 스크린샷
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${retryCount}-10-dashboard-success.png`), fullPage: true });
          break;
        } else {
          console.log('⚠️  Dashboard not reached yet');

          // 현재 페이지 상태 분석
          const pageTitle = await page.title();
          const bodyText = await page.locator('body').innerText().catch(() => '');

          console.log(`📄 Page title: ${pageTitle}`);
          console.log(`📝 Body text preview: ${bodyText.substring(0, 200)}...`);

          throw new Error('Dashboard not reached');
        }

      } catch (error: any) {
        console.log(`\n❌ Attempt ${retryCount} failed: ${error.message}`);

        if (retryCount < maxRetries) {
          console.log(`⏳ Waiting 3 seconds before retry...`);
          await page.waitForTimeout(3000);
        }
      }
    }

    // 최종 결과
    if (dashboardReached) {
      console.log('\n✅ ============================================');
      console.log('✅ E2E Test PASSED - Dashboard reached!');
      console.log('✅ ============================================');
    } else {
      console.log('\n❌ ============================================');
      console.log(`❌ E2E Test FAILED after ${maxRetries} attempts`);
      console.log('❌ Dashboard not reached');
      console.log('❌ ============================================');
      throw new Error('Failed to reach dashboard');
    }
  });
});
