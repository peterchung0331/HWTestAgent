import { test, expect } from '@playwright/test';
import { loginWithGoogle, getTestGoogleCredentials } from './helpers/google-oauth-helper';

test('Debug: Click Hub card after Google OAuth login', async ({ page }) => {
  console.log('=== Authenticated (Google OAuth) Click Debug ===\n');

  // 에러 캡처
  const errors: string[] = [];
  page.on('console', msg => console.log(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log(`❌ PAGE ERROR: ${error.message}`);
  });

  // 1. Google OAuth 로그인
  const { email, password } = getTestGoogleCredentials();
  console.log('1️⃣ Logging in with Google OAuth...');

  const loginSuccess = await loginWithGoogle(page, {
    email,
    password,
    loginUrl: 'https://staging.workhub.biz:4400',
    redirectPath: '/hubs',
    timeout: 60000
  });

  if (!loginSuccess) {
    console.log('❌ Google OAuth login failed, continuing anyway...');
  }

  // 2. /hubs 페이지로 이동 (로그인 후 이미 /hubs에 있을 수도 있음)
  console.log('\n2️⃣ Navigating to /hubs...');
  if (!page.url().includes('/hubs')) {
    await page.goto('https://staging.workhub.biz:4400/hubs', {
      waitUntil: 'networkidle'
    });
  }
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

    return buttons.slice(0, 2).map(btn => ({
      text: btn.textContent,
      computedPointerEvents: window.getComputedStyle(btn).pointerEvents,
      inlineStyle: (btn as HTMLElement).style.cssText,
    }));
  });
  console.log('\n4️⃣ Button styles:', JSON.stringify(buttonStyles, null, 2));

  // 5. 클릭 전 URL
  const urlBefore = page.url();
  console.log(`\n5️⃣ URL before click: ${urlBefore}`);

  // 6. 클릭
  console.log('6️⃣ Clicking Sales Hub card...');
  const button = page.locator('text=대시보드로 이동').first();

  // 버튼이 보이는지 확인
  await expect(button).toBeVisible();
  console.log('   ✅ Button is visible');

  await button.click();
  console.log('✅ Click executed\n');

  // 7. 3초 대기 (리디렉션 또는 에러 발생 대기)
  await page.waitForTimeout(3000);

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
  } else if (urlAfter === urlBefore) {
    console.log('❌ NO REDIRECT - Click may have failed!');
  } else {
    console.log(`⚠️ Unexpected URL: ${urlAfter}`);
  }

  expect(isRedirected).toBeTruthy();

  console.log('\n=== Debug Complete ===');
});
