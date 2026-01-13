import { test, expect } from '@playwright/test';

test('E2E: Access SalesHub from HubManager', async ({ page }) => {
  // 네트워크 및 콘솔 모니터링
  const requests: string[] = [];
  const responses: any[] = [];
  const consoleErrors: string[] = [];

  page.on('request', request => {
    requests.push(`${request.method()} ${request.url()}`);
  });

  page.on('response', async response => {
    if (response.url().includes('/api/')) {
      try {
        const body = await response.text();
        responses.push({
          url: response.url(),
          status: response.status(),
          body: body.substring(0, 500), // 처음 500자만
        });
      } catch (e) {
        // ignore
      }
    }
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Step 1: /hubs 페이지 접속
  console.log('📍 Step 1: Navigate to /hubs');
  await page.goto('http://localhost:3090/hubs', { waitUntil: 'networkidle' });

  // 스크린샷 1: Hub 선택 페이지
  await page.screenshot({
    path: '/home/peterchung/HWTestAgent/test-results/step1-hubs-page.png',
    fullPage: true
  });
  console.log('📸 Screenshot: step1-hubs-page.png');

  // Step 2: 개발 환경 자동 로그인 대기
  console.log('📍 Step 2: Wait for dev auto-login');
  await page.waitForTimeout(2000);

  // Step 3: SalesHub 카드 클릭
  console.log('📍 Step 3: Click SalesHub card');
  const salesHubCard = page.locator('text=Sales Hub').first();
  await salesHubCard.click();

  // Step 4: 리디렉션 대기 (Google OAuth 또는 SalesHub)
  console.log('📍 Step 4: Wait for redirect');
  await page.waitForTimeout(3000);

  // 현재 URL 확인
  const currentUrl = page.url();
  console.log(`✅ Current URL: ${currentUrl}`);

  // 스크린샷 2: 리디렉션 후
  await page.screenshot({
    path: '/home/peterchung/HWTestAgent/test-results/step2-after-click.png',
    fullPage: true
  });
  console.log('📸 Screenshot: step2-after-click.png');

  // API 요청 로그
  console.log('\n=== API Requests ===');
  requests.filter(r => r.includes('/api/')).forEach(req => console.log(req));

  // API 응답 로그
  console.log('\n=== API Responses ===');
  responses.forEach(res => {
    console.log(`${res.status} ${res.url}`);
    if (res.body) console.log(`  Body: ${res.body}`);
  });

  // 콘솔 에러 로그
  if (consoleErrors.length > 0) {
    console.log('\n=== Console Errors ===');
    consoleErrors.forEach(err => console.log(`❌ ${err}`));
  }

  // 토큰 확인 (올바른 키 사용)
  const tokens = await page.evaluate(() => ({
    accessToken: sessionStorage.getItem('wbhub_access_token'),
    refreshToken: localStorage.getItem('wbhub_refresh_token'),
  }));
  console.log('\n🔑 Tokens in storage:');
  console.log(`  accessToken (sessionStorage): ${tokens.accessToken ? '✅ Present' : '❌ Missing'}`);
  console.log(`  refreshToken (localStorage): ${tokens.refreshToken ? '✅ Present' : '❌ Missing'}`);

  // 최종 검증
  if (currentUrl.includes('localhost:3010')) {
    console.log('✅ Successfully redirected to SalesHub (3010)');
  } else if (currentUrl.includes('google')) {
    console.log('⚠️ Redirected to Google OAuth (expected if no session)');
  } else {
    console.log(`❌ Unexpected URL: ${currentUrl}`);
  }
});
