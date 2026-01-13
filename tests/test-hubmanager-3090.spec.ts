import { test, expect } from '@playwright/test';

test('HubManager 3090 접속 테스트', async ({ page }) => {
  // 네트워크 및 콘솔 모니터링
  page.on('requestfailed', request => {
    console.log('❌ Request failed:', request.url());
  });
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('❌ Console Error:', msg.text());
  });

  console.log('🔍 Navigating to http://localhost:3090...');

  // 페이지 접속
  const response = await page.goto('http://localhost:3090', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  console.log(`📊 Status: ${response?.status()}`);

  // 스크린샷 저장
  await page.screenshot({
    path: '/home/peterchung/HWTestAgent/test-results/hubmanager-3090.png',
    fullPage: true
  });

  console.log('📸 Screenshot saved: test-results/hubmanager-3090.png');

  // 페이지 타이틀 확인
  const title = await page.title();
  console.log(`📄 Page title: ${title}`);

  // HTML 내용 일부 출력
  const bodyText = await page.locator('body').textContent();
  console.log(`📝 Body text (first 200 chars): ${bodyText?.substring(0, 200)}`);

  // 기본 검증
  expect(response?.status()).toBe(200);
});
