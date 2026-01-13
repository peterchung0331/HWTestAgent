import { test, expect } from '@playwright/test';

test('Verify GlobalNav removed from staging /hubs page', async ({ page }) => {
  // 네트워크 및 콘솔 모니터링
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
    }
  });

  page.on('requestfailed', request => {
    errors.push(`Request Failed: ${request.url()} - ${request.failure()?.errorText}`);
  });

  console.log('Navigating to staging /hubs page...');
  const response = await page.goto('https://staging.workhub.biz:4400/hubs', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  console.log(`Response status: ${response?.status()}`);

  // 스크린샷 저장
  await page.screenshot({
    path: '/home/peterchung/HWTestAgent/test-results/staging-hubs-no-globalnav.png',
    fullPage: true
  });

  console.log('Screenshot saved: test-results/staging-hubs-no-globalnav.png');

  // GlobalNav가 없는지 확인
  const globalNav = await page.locator('nav.bg-blue-600').count();
  console.log(`GlobalNav elements found: ${globalNav}`);
  expect(globalNav).toBe(0);

  // 에러 출력
  if (errors.length > 0) {
    console.log('Errors detected:');
    errors.forEach(err => console.log(`  - ${err}`));
  }

  console.log('✅ Verification complete: GlobalNav successfully removed');
});
