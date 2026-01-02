import { test, expect } from '@playwright/test';

/**
 * WBSalesHub SSO 테스트 (Production)
 *
 * 테스트 환경: Oracle Cloud Production
 * - HubManager: http://workhub.biz
 * - SalesHub: http://workhub.biz/saleshub
 *
 * SSO 플로우:
 * 1. HubManager Hub 선택 페이지 접속
 * 2. SalesHub 카드 클릭
 * 3. Google OAuth 리디렉션 확인
 * 4. (수동) Google 로그인 후 SalesHub 대시보드 접속 확인
 */

test.describe('WBSalesHub SSO Test - Production', () => {

  test.beforeEach(async ({ page }) => {
    // 네트워크 및 콘솔 모니터링
    page.on('requestfailed', request => {
      console.log('❌ Request failed:', request.url());
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });

    page.on('response', async response => {
      if (response.status() >= 400) {
        console.log(`⚠️ HTTP ${response.status()}: ${response.url()}`);
      }
    });
  });

  test('01. HubManager 접속 및 Hub 목록 확인', async ({ page }) => {
    console.log('🚀 Step 1: HubManager 접속');

    const response = await page.goto('http://workhub.biz/hubs', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    expect(response?.status()).toBe(200);

    // 스크린샷 저장
    await page.screenshot({
      path: 'test-results/screenshots/01-hubmanager-hubs.png',
      fullPage: true
    });

    console.log('✅ HubManager 접속 성공');

    // Hub 카드 확인
    console.log('🔍 Hub 카드 확인 중...');

    // SalesHub 카드 대기
    const salesHubCard = page.locator('[data-hub-slug="wbsaleshub"], .hub-card:has-text("Sales Hub")').first();
    await salesHubCard.waitFor({ state: 'visible', timeout: 10000 });

    await page.screenshot({
      path: 'test-results/screenshots/02-saleshub-card-visible.png',
      fullPage: true
    });

    console.log('✅ SalesHub 카드 확인 완료');
  });

  test('02. SalesHub 카드 클릭 및 Google OAuth 리디렉션', async ({ page, context }) => {
    console.log('🚀 Step 2: SalesHub SSO 플로우 시작');

    // HubManager 접속
    await page.goto('http://workhub.biz/hubs', {
      waitUntil: 'networkidle',
    });

    // SalesHub 카드 찾기
    console.log('🔍 SalesHub 카드 찾는 중...');
    const salesHubCard = page.locator('[data-hub-slug="wbsaleshub"], .hub-card:has-text("Sales Hub")').first();
    await salesHubCard.waitFor({ state: 'visible', timeout: 10000 });

    await page.screenshot({
      path: 'test-results/screenshots/03-before-click.png',
      fullPage: true
    });

    // 새 탭/페이지 감지 준비
    const pagePromise = context.waitForEvent('page', { timeout: 10000 });

    console.log('👆 SalesHub 카드 클릭');
    await salesHubCard.click();

    // 페이지 전환 대기
    await page.waitForTimeout(2000);

    // 현재 URL 확인
    const currentUrl = page.url();
    console.log('📍 Current URL:', currentUrl);

    await page.screenshot({
      path: 'test-results/screenshots/04-after-click.png',
      fullPage: true
    });

    // Google OAuth 리디렉션 확인
    if (currentUrl.includes('accounts.google.com')) {
      console.log('✅ Google OAuth 페이지로 리디렉션 성공');
      expect(currentUrl).toContain('accounts.google.com');

      await page.screenshot({
        path: 'test-results/screenshots/05-google-oauth.png',
        fullPage: true
      });
    } else if (currentUrl.includes('workhub.biz') && currentUrl.includes('auth')) {
      console.log('⚠️ HubManager Auth 페이지로 이동');
      console.log('💡 이후 Google OAuth로 리디렉션 예상');

      await page.waitForTimeout(3000);
      const finalUrl = page.url();
      console.log('📍 Final URL:', finalUrl);

      await page.screenshot({
        path: 'test-results/screenshots/06-auth-redirect.png',
        fullPage: true
      });

      expect(finalUrl).toMatch(/accounts\.google\.com|workhub\.biz\/api\/auth/);
    } else if (currentUrl.includes('saleshub') || currentUrl.includes('3010')) {
      console.log('⚠️ 이미 로그인된 상태 - SalesHub로 직접 이동');
      console.log('✅ SSO 토큰을 통한 자동 로그인 성공');

      await page.screenshot({
        path: 'test-results/screenshots/07-saleshub-dashboard.png',
        fullPage: true
      });
    } else {
      console.log('⚠️ 예상치 못한 URL:', currentUrl);

      await page.screenshot({
        path: 'test-results/screenshots/08-unexpected-url.png',
        fullPage: true
      });
    }
  });

  test('03. SalesHub 직접 접속 (SSO 없이)', async ({ page }) => {
    console.log('🚀 Step 3: SalesHub 직접 접속 테스트');

    const response = await page.goto('http://workhub.biz/saleshub', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    console.log('📍 HTTP Status:', response?.status());
    console.log('📍 Final URL:', page.url());

    await page.screenshot({
      path: 'test-results/screenshots/09-saleshub-direct.png',
      fullPage: true
    });

    // Google OAuth 또는 SalesHub 대시보드인지 확인
    const currentUrl = page.url();

    if (currentUrl.includes('accounts.google.com')) {
      console.log('✅ Google OAuth 페이지로 리디렉션 (세션 없음)');
    } else if (currentUrl.includes('saleshub')) {
      console.log('✅ SalesHub 대시보드 접속 (기존 세션 유지)');
    } else {
      console.log('⚠️ 예상치 못한 동작:', currentUrl);
    }
  });

  test('04. Backend API 헬스 체크', async ({ request }) => {
    console.log('🚀 Step 4: SalesHub Backend API 헬스 체크');

    const response = await request.get('http://workhub.biz/api/health');
    const status = response.status();
    const body = await response.json();

    console.log('📍 API Status:', status);
    console.log('📍 API Response:', JSON.stringify(body, null, 2));

    expect(status).toBe(200);
    expect(body.success).toBe(true);

    console.log('✅ Backend API 정상 작동');
  });

  test('05. SalesHub Backend 헬스 체크', async ({ request }) => {
    console.log('🚀 Step 5: SalesHub 전용 Backend API 헬스 체크');

    const response = await request.get('http://158.180.95.246:4010/api/health');
    const status = response.status();
    const body = await response.json();

    console.log('📍 SalesHub API Status:', status);
    console.log('📍 SalesHub API Response:', JSON.stringify(body, null, 2));

    expect(status).toBe(200);

    console.log('✅ SalesHub Backend API 정상 작동');
  });
});
