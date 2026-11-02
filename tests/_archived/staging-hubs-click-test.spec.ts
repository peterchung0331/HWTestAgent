import { test, expect } from '@playwright/test';

test('Test hub card click on staging', async ({ page }) => {
  // 콘솔 로그 모니터링
  const logs: string[] = [];
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  console.log('Navigating to staging /hubs page...');
  await page.goto('https://staging.workhub.biz:4400/hubs', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  // 페이지 로드 확인
  await page.waitForSelector('text=Sales Hub', { timeout: 10000 });
  console.log('✅ Page loaded, Sales Hub card visible');

  // 스크린샷 1: 클릭 전
  await page.screenshot({
    path: '/home/peterchung/HWTestAgent/test-results/before-click.png',
    fullPage: true
  });

  // Sales Hub 카드 찾기
  const salesHubCard = page.locator('text=Sales Hub').locator('..');
  console.log('Sales Hub card found');

  // 클릭 전 로그 출력
  console.log('Console logs before click:', logs);

  // 카드 클릭
  console.log('Clicking Sales Hub card...');
  await salesHubCard.click();

  // 클릭 후 1초 대기
  await page.waitForTimeout(1000);

  // 스크린샷 2: 클릭 후
  await page.screenshot({
    path: '/home/peterchung/HWTestAgent/test-results/after-click.png',
    fullPage: true
  });

  // 클릭 후 로그 출력
  console.log('Console logs after click:', logs);

  // URL 변경 확인 (Google OAuth 또는 스플래시 화면으로 이동했는지)
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);

  // 클릭 이벤트가 작동했는지 확인
  const isRedirected = currentUrl !== 'https://staging.workhub.biz:4400/hubs';
  console.log(`Redirect occurred: ${isRedirected}`);

  // 모든 로그 출력
  console.log('\n=== All Console Logs ===');
  logs.forEach(log => console.log(log));
});
