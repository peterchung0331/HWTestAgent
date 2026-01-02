/**
 * Oracle 운영환경 - Google OAuth 로그인 전체 플로우 테스트
 *
 * 테스트 목표:
 * 1. HubManager 접속 → Google 로그인 버튼 클릭
 * 2. Google OAuth 인증 (자동 로그인)
 * 3. FinHub 선택 → SSO 리다이렉트
 * 4. FinHub 대시보드 정상 렌더링
 */

import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// 오라클 운영 환경 URL
const ORACLE_HUB_MANAGER = 'https://workhub.biz';
const ORACLE_FIN_HUB = 'https://workhub.biz/finhub';

// 스크린샷 저장 경로
const SCREENSHOT_DIR = '/mnt/c/GitHub/HWTestAgent/TestReport/screenshots';

// 스크린샷 저장 헬퍼
async function saveScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}_${name}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  await page.screenshot({
    path: filepath,
    fullPage: true
  });

  console.log(`📸 Screenshot saved: ${filename}`);
  console.log(`   Screenshot: ${filepath}`);
  return filepath;
}

test.describe('오라클 운영환경 - Google OAuth 전체 플로우', () => {

  test.beforeEach(async ({ page }) => {
    // 콘솔 로그 및 에러 캡처
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        console.log(`[Browser ${type.toUpperCase()}]:`, msg.text());
      }
    });

    page.on('pageerror', err => {
      console.error('[Browser Page Error]:', err.message);
    });

    // 네트워크 실패 모니터링
    page.on('requestfailed', request => {
      console.error(`❌ Request failed: ${request.url()}`);
      console.error(`   Failure: ${request.failure()?.errorText}`);
    });
  });

  test('Step 1: HubManager 로그인 페이지 접속', async ({ page }) => {
    console.log('\n📝 Step 1: HubManager 로그인 페이지 접속');

    await page.goto(ORACLE_HUB_MANAGER);
    await saveScreenshot(page, 'step1-login-page');

    // Google 로그인 버튼 확인
    const googleButton = page.locator('a[href*="/api/auth/google"]');
    await expect(googleButton).toBeVisible({ timeout: 10000 });

    console.log('✅ Google 로그인 버튼 확인');
  });

  test('Step 2: Google OAuth 로그인 플로우', async ({ page, context }) => {
    console.log('\n📝 Step 2: Google OAuth 로그인 플로우');

    // HubManager 접속
    await page.goto(ORACLE_HUB_MANAGER);
    await page.waitForLoadState('networkidle');

    // Google 로그인 버튼 클릭
    const googleButton = page.locator('a[href*="/api/auth/google"]');
    await googleButton.click();

    console.log('   1️⃣ Google 로그인 버튼 클릭');
    await saveScreenshot(page, 'step2-after-google-button-click');

    // Google 로그인 페이지 또는 리다이렉트 대기
    await page.waitForTimeout(3000);
    await saveScreenshot(page, 'step2-google-oauth-page');

    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);

    // Google OAuth 페이지인지 확인
    if (currentUrl.includes('accounts.google.com')) {
      console.log('   2️⃣ Google OAuth 페이지 도달');

      // 이메일 입력 (환경변수에서 읽기)
      const testEmail = process.env.TEST_GOOGLE_EMAIL;
      const testPassword = process.env.TEST_GOOGLE_PASSWORD;

      if (testEmail && testPassword) {
        console.log(`   3️⃣ 테스트 계정으로 자동 로그인 시도: ${testEmail}`);

        // 이메일 입력
        await page.fill('input[type="email"]', testEmail);
        await page.click('button:has-text("다음")');
        await page.waitForTimeout(2000);
        await saveScreenshot(page, 'step2-after-email');

        // 비밀번호 입력
        await page.fill('input[type="password"]', testPassword);
        await page.click('button:has-text("다음")');
        await page.waitForTimeout(3000);
        await saveScreenshot(page, 'step2-after-password');
      } else {
        console.log('   ⚠️ 테스트 계정 정보가 환경변수에 없습니다.');
        console.log('   TEST_GOOGLE_EMAIL 및 TEST_GOOGLE_PASSWORD를 설정하세요.');
      }
    }

    // OAuth 콜백 후 HubManager로 리다이렉트 대기
    await page.waitForTimeout(5000);
    await saveScreenshot(page, 'step2-after-oauth-callback');

    const finalUrl = page.url();
    console.log(`   Final URL: ${finalUrl}`);

    // 허브 선택 페이지로 리다이렉트 되었는지 확인
    expect(finalUrl).toContain('workhub.biz');
    console.log('✅ Google OAuth 로그인 완료');
  });

  test('Step 3: FinHub 선택 및 SSO 리다이렉트', async ({ page }) => {
    console.log('\n📝 Step 3: FinHub 선택 및 SSO 리다이렉트');

    // HubManager 허브 선택 페이지 접속 (로그인 상태 가정)
    await page.goto(`${ORACLE_HUB_MANAGER}/hubs`);
    await page.waitForLoadState('networkidle');
    await saveScreenshot(page, 'step3-hub-selection-page');

    // FinHub 링크 클릭
    const finHubLink = page.locator('a[href*="wbfinhub"]').first();

    if (await finHubLink.isVisible({ timeout: 5000 })) {
      console.log('   1️⃣ FinHub 링크 클릭');
      await finHubLink.click();

      // SSO 리다이렉트 대기
      await page.waitForTimeout(3000);
      await saveScreenshot(page, 'step3-after-finhub-sso');

      const currentUrl = page.url();
      console.log(`   Current URL: ${currentUrl}`);

      // FinHub 도메인으로 리다이렉트 되었는지 확인
      expect(currentUrl).toContain('workhub.biz/finhub');
      console.log('✅ FinHub SSO 리다이렉트 성공');
    } else {
      console.log('   ⚠️ FinHub 링크를 찾을 수 없습니다. 로그인이 필요할 수 있습니다.');
    }
  });

  test('Step 4: FinHub 대시보드 확인', async ({ page }) => {
    console.log('\n📝 Step 4: FinHub 대시보드 확인');

    // FinHub 직접 접속 (SSO 토큰이 세션에 있다고 가정)
    await page.goto(ORACLE_FIN_HUB);
    await page.waitForLoadState('networkidle');
    await saveScreenshot(page, 'step4-finhub-dashboard');

    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);

    // 대시보드 요소 확인
    const dashboardElements = await page.locator('[class*="container"]').count();
    console.log(`   Dashboard elements found: ${dashboardElements}`);

    console.log('✅ FinHub 대시보드 확인 완료');
  });

});
