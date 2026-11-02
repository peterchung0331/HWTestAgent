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
const SCREENSHOT_DIR = path.join(__dirname, '../test-results/MyTester/screenshots', `${new Date().toISOString().split('T')[0]}-saleshub-oauth-direct`);

// 스크린샷 디렉토리 생성
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('SalesHub Direct OAuth Test', () => {
  test.setTimeout(180000);

  test('직접 OAuth URL로 접근하여 대시보드까지 이동', async ({ page }) => {
    console.log('🚀 Starting SalesHub Direct OAuth Test...');
    console.log(`🔑 Google Email: ${GOOGLE_EMAIL}`);

    // 네트워크 모니터링
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/auth') || url.includes('/api')) {
        console.log(`📡 [${response.status()}] ${url}`);
      }
    });

    let retryCount = 0;
    const maxRetries = 3;
    let dashboardReached = false;

    while (!dashboardReached && retryCount < maxRetries) {
      retryCount++;
      console.log(`\n🔄 Attempt ${retryCount}/${maxRetries}`);

      try {
        // 1. 직접 OAuth URL로 이동
        console.log('\n📊 Step 1: Going directly to OAuth URL...');
        const oauthUrl = 'http://localhost:4090/api/auth/google-oauth?app=wbsaleshub&redirect=http://localhost:4010/auth/sso-complete&finalRedirect=/';
        console.log(`🔗 OAuth URL: ${oauthUrl}`);

        await page.goto(oauthUrl, { waitUntil: 'networkidle', timeout: 60000 });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${retryCount}-01-after-oauth-url.png`), fullPage: true });
        console.log(`📍 Current URL: ${page.url()}`);

        // 2. Google 로그인 페이지 확인
        console.log('\n📊 Step 2: Checking for Google login...');

        try {
          // Google 로그인 페이지인지 확인
          await page.waitForURL('**/accounts.google.com/**', { timeout: 5000 });
          console.log('🔓 Google login page detected');
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${retryCount}-02-google-login.png`), fullPage: true });

          // 계정 선택 페이지 처리
          const accountEmail = page.locator(`[data-email="${GOOGLE_EMAIL}"]`);
          const accountContainer = page.locator(`div:has-text("${GOOGLE_EMAIL}")`).first();

          const accountEmailVisible = await accountEmail.isVisible().catch(() => false);
          const accountContainerVisible = await accountContainer.isVisible().catch(() => false);

          if (accountEmailVisible || accountContainerVisible) {
            console.log('👤 Account chooser detected, clicking account...');

            // 계정 이메일 또는 컨테이너 클릭 시도
            if (accountEmailVisible) {
              await accountEmail.click();
            } else {
              await accountContainer.click();
            }

            await page.waitForTimeout(2000); // 클릭 후 잠시 대기
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${retryCount}-03-account-selected.png`), fullPage: true });

            // 페이지 변화 대기
            const urlChanged = await page.waitForURL(
              url => !url.includes('accountchooser'),
              { timeout: 10000 }
            ).then(() => true).catch(() => false);

            if (urlChanged) {
              console.log('✅ Account selected, navigated away from chooser');
            } else {
              console.log('⚠️  Account clicked but still on chooser page');
            }
          } else {
            // 이메일 입력
            console.log('📧 Entering email...');
            await page.waitForSelector('input[type="email"]', { timeout: 20000 });
            await page.fill('input[type="email"]', GOOGLE_EMAIL);
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${retryCount}-03-email-entered.png`), fullPage: true });

            // 다음 버튼 클릭
            const nextButton = page.locator('#identifierNext, button:has-text("Next"), button:has-text("다음")').first();
            await nextButton.click();
            console.log('✅ Email entered, clicked next');

            // 비밀번호 입력
            console.log('🔑 Entering password...');
            await page.waitForSelector('input[type="password"]', { timeout: 20000 });
            await page.fill('input[type="password"]', GOOGLE_PASSWORD);
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${retryCount}-04-password-entered.png`), fullPage: true });

            // 다음 버튼 클릭
            const passwordNext = page.locator('#passwordNext, button:has-text("Next"), button:has-text("다음")').first();
            await passwordNext.click();
            console.log('✅ Password entered, clicked next');
          }

          // OAuth 동의 페이지 처리
          console.log('⏳ Checking for consent page...');
          await page.waitForTimeout(2000);

          // "Continue" 버튼 찾기 및 클릭
          const continueButton = page.locator('button:has-text("Continue"), button:has-text("계속")').first();
          const continueVisible = await continueButton.isVisible().catch(() => false);

          if (continueVisible) {
            console.log('✅ Consent page detected, clicking Continue...');
            await continueButton.click();
            await page.waitForLoadState('networkidle', { timeout: 60000 });
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${retryCount}-06-consent-approved.png`), fullPage: true });
            console.log('✅ Consent approved');
          } else {
            console.log('ℹ️  No consent page (already approved)');
          }

          // OAuth 완료 대기
          console.log('⏳ Waiting for OAuth callback...');
          await page.waitForLoadState('networkidle', { timeout: 60000 });
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${retryCount}-07-oauth-complete.png`), fullPage: true });
          console.log(`📍 Current URL after OAuth: ${page.url()}`);

        } catch (error: any) {
          console.log(`ℹ️  No Google login required or already authenticated: ${error.message}`);
        }

        // 3. 최종 URL 확인
        console.log('\n📊 Step 3: Checking final URL...');
        await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
        const finalUrl = page.url();
        console.log(`📍 Final URL: ${finalUrl}`);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${retryCount}-06-final-page.png`), fullPage: true });

        // 대시보드 확인
        const isDashboard = finalUrl.includes('/saleshub') ||
                           finalUrl === 'http://localhost:3010/' ||
                           await page.locator('[data-testid="dashboard"], [role="main"], nav').count() > 0;

        if (isDashboard && !finalUrl.includes('/login')) {
          console.log('✅ Dashboard reached!');
          dashboardReached = true;
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${retryCount}-07-dashboard-success.png`), fullPage: true });
          break;
        } else {
          console.log('⚠️  Not on dashboard yet');
          console.log(`📄 Page title: ${await page.title()}`);
          throw new Error('Dashboard not reached');
        }

      } catch (error: any) {
        console.log(`\n❌ Attempt ${retryCount} failed: ${error.message}`);
        if (retryCount < maxRetries) {
          console.log('⏳ Waiting 3 seconds before retry...');
          await page.waitForTimeout(3000);
        }
      }
    }

    // 최종 결과
    if (dashboardReached) {
      console.log('\n✅ ============================================');
      console.log('✅ Test PASSED - Dashboard reached!');
      console.log('✅ ============================================');
    } else {
      console.log('\n❌ ============================================');
      console.log(`❌ Test FAILED after ${maxRetries} attempts`);
      console.log('❌ ============================================');
      throw new Error('Failed to reach dashboard');
    }
  });
});
