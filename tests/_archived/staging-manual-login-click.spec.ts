import { test, expect } from '@playwright/test';

test('Manual login and click test (long timeout)', async ({ page }) => {
  console.log('=== Manual Login and Click Test ===\n');

  // 에러 캡처
  const errors: string[] = [];
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    console.log(text);
  });

  page.on('pageerror', error => {
    const text = `❌ PAGE ERROR: ${error.message}`;
    errors.push(text);
    console.log(text);
  });

  page.on('requestfailed', request => {
    const text = `❌ REQUEST FAILED: ${request.url()}`;
    errors.push(text);
    console.log(text);
  });

  console.log('1️⃣ Opening staging /hubs page...');
  await page.goto('https://staging.workhub.biz:4400/hubs', {
    waitUntil: 'networkidle'
  });

  await page.waitForSelector('text=Sales Hub', { timeout: 10000 });
  console.log('✅ Page loaded\n');

  console.log('⏳ Waiting for 5 minutes for you to login and test clicking...');
  console.log('   - Please login manually if needed');
  console.log('   - Then try clicking the Sales Hub card');
  console.log('   - The browser will stay open for 5 minutes\n');

  // 5분 대기 (300초)
  await page.waitForTimeout(300000);

  // 최종 상태 확인
  console.log('\n=== Final State ===');
  console.log('Current URL:', page.url());

  if (errors.length > 0) {
    console.log('\n❌ Errors detected during session:');
    errors.forEach(err => console.log(err));
  } else {
    console.log('\n✅ No errors detected during session');
  }

  console.log('\n=== Test Complete ===');
});
