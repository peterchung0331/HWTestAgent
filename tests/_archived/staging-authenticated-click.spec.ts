import { test, expect } from '@playwright/test';

test('Debug: Click Hub card when authenticated', async ({ page }) => {
  console.log('=== Authenticated Click Debug ===\n');

  // 에러 캡처
  const errors: string[] = [];
  page.on('console', msg => console.log(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log(`❌ PAGE ERROR: ${error.message}`);
  });
  page.on('requestfailed', request => {
    errors.push(`${request.url()} - ${request.failure()?.errorText}`);
    console.log(`❌ REQUEST FAILED: ${request.url()}`);
  });

  // 1. 로그인 (dev-login 사용)
  console.log('1️⃣ Logging in with dev-login...');
  await page.goto('https://staging.workhub.biz:4400/api/auth/dev-login?email=peter.chung@wavebridge.com');
  await page.waitForTimeout(2000);
  console.log('✅ Logged in\n');

  // 2. /hubs 페이지로 이동
  console.log('2️⃣ Navigating to /hubs...');
  await page.goto('https://staging.workhub.biz:4400/hubs', {
    waitUntil: 'networkidle'
  });
  await page.waitForSelector('text=Sales Hub', { timeout: 10000 });
  console.log('✅ Page loaded\n');

  // 3. 로그인 상태 확인
  const authState = await page.evaluate(async () => {
    const response = await fetch('/api/auth/me', { credentials: 'include' });
    const data = await response.json();
    return data;
  });
  console.log('3️⃣ Auth state:', JSON.stringify(authState, null, 2));

  // 4. 버튼 스타일 확인
  const buttonStyles = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('div')).filter(
      el => el.textContent === '대시보드로 이동'
    );

    return buttons.map(btn => ({
      text: btn.textContent,
      computedPointerEvents: window.getComputedStyle(btn).pointerEvents,
      inlineStyle: (btn as HTMLElement).style.cssText,
      className: btn.className,
    }));
  });
  console.log('\n4️⃣ Button styles:', JSON.stringify(buttonStyles, null, 2));

  // 5. 클릭 전 URL
  const urlBefore = page.url();
  console.log(`\n5️⃣ URL before click: ${urlBefore}`);

  // 6. 클릭
  console.log('6️⃣ Clicking Sales Hub card...');
  const button = page.locator('text=대시보드로 이동').first();
  await button.click();
  console.log('✅ Click executed\n');

  // 7. 2초 대기
  await page.waitForTimeout(2000);

  // 8. 클릭 후 URL
  const urlAfter = page.url();
  console.log(`7️⃣ URL after click: ${urlAfter}`);

  // 9. 에러 확인
  if (errors.length > 0) {
    console.log('\n❌ ERRORS DETECTED:');
    errors.forEach(err => console.log(err));
  } else {
    console.log('\n✅ No errors detected');
  }

  // 10. 검증
  const isRedirected = urlAfter !== urlBefore;
  console.log(`\n8️⃣ Redirected: ${isRedirected}`);

  if (urlAfter.includes('saleshub')) {
    console.log('✅ Redirected to SalesHub (expected when authenticated)');
  } else if (urlAfter.includes('accounts.google.com')) {
    console.log('⚠️ Redirected to Google OAuth (unexpected when authenticated)');
  } else {
    console.log(`⚠️ URL: ${urlAfter}`);
  }

  expect(isRedirected).toBeTruthy();

  console.log('\n=== Debug Complete ===');
});
