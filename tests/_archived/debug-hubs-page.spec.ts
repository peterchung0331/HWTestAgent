import { test, expect } from '@playwright/test';

test('Debug /hubs page - Check SalesHub access', async ({ page }) => {
  // 네트워크 및 콘솔 모니터링
  const requests: string[] = [];
  const failedRequests: any[] = [];
  const consoleErrors: string[] = [];

  page.on('request', request => {
    requests.push(`${request.method()} ${request.url()}`);
  });

  page.on('requestfailed', request => {
    failedRequests.push({
      url: request.url(),
      failure: request.failure()?.errorText,
    });
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // /hubs 페이지 접속
  console.log('📍 Navigating to http://localhost:3090/hubs');
  const response = await page.goto('http://localhost:3090/hubs', { waitUntil: 'networkidle' });

  console.log(`✅ Page loaded with status: ${response?.status()}`);

  // 스크린샷 저장
  await page.screenshot({
    path: '/home/peterchung/HWTestAgent/test-results/hubs-page-debug.png',
    fullPage: true
  });
  console.log('📸 Screenshot saved to test-results/hubs-page-debug.png');

  // 요청 로그
  console.log('\n=== Network Requests ===');
  requests.forEach(req => console.log(req));

  // 실패한 요청 로그
  if (failedRequests.length > 0) {
    console.log('\n=== Failed Requests ===');
    failedRequests.forEach(req => {
      console.log(`❌ ${req.url}`);
      console.log(`   Error: ${req.failure}`);
    });
  }

  // 콘솔 에러 로그
  if (consoleErrors.length > 0) {
    console.log('\n=== Console Errors ===');
    consoleErrors.forEach(err => console.log(`❌ ${err}`));
  }

  // Hub 목록이 표시되는지 확인
  const hubCards = page.locator('[class*="HubCard"], .hub-card, h3:has-text("Sales")');
  const count = await hubCards.count();
  console.log(`\n✅ Found ${count} hub cards`);

  // SalesHub 카드 찾기
  const salesHub = page.getByText('Sales Hub', { exact: false });
  const salesHubVisible = await salesHub.isVisible().catch(() => false);
  console.log(`SalesHub visible: ${salesHubVisible}`);

  // 개발 환경 자동 로그인 확인
  await page.waitForTimeout(2000);
  const devLoginLogs = requests.filter(r => r.includes('/api/auth/dev-login'));
  console.log(`\n🔐 Dev-login requests: ${devLoginLogs.length}`);
  devLoginLogs.forEach(log => console.log(`  ${log}`));

  // localStorage 토큰 확인
  const tokens = await page.evaluate(() => ({
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
  }));
  console.log('\n🔑 Tokens in localStorage:');
  console.log(`  accessToken: ${tokens.accessToken ? '✅ Present' : '❌ Missing'}`);
  console.log(`  refreshToken: ${tokens.refreshToken ? '✅ Present' : '❌ Missing'}`);
});
