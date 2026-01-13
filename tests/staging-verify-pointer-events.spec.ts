import { test } from '@playwright/test';

test('Verify pointer-events-none is applied', async ({ page }) => {
  console.log('🔍 Verifying pointer-events-none in staging build\n');

  await page.goto('https://staging.workhub.biz:4400/hubs', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  await page.waitForSelector('text=Sales Hub', { timeout: 10000 });
  console.log('✅ Page loaded\n');

  // 버튼 스타일 확인
  const buttonStyles = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('div')).filter(el =>
      el.textContent?.includes('대시보드로 이동') &&
      el.className.includes('text-white')
    );

    return buttons.map(btn => ({
      text: btn.textContent?.substring(0, 20),
      className: btn.className,
      hasPointerEventsNone: btn.className.includes('pointer-events-none'),
      computedPointerEvents: window.getComputedStyle(btn).pointerEvents,
    }));
  });

  console.log('Button styles:', JSON.stringify(buttonStyles, null, 2));

  // HTML 소스 확인
  const htmlSource = await page.content();
  const hasPointerEventsNone = htmlSource.includes('pointer-events-none');
  console.log(`\nHTML contains 'pointer-events-none': ${hasPointerEventsNone}`);

  // 스크린샷
  await page.screenshot({
    path: '/home/peterchung/HWTestAgent/test-results/verify-pointer-events.png',
    fullPage: true
  });

  console.log('\n✅ Verification complete');
});
