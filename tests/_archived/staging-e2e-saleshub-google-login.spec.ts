import { test, expect } from '@playwright/test';

test('E2E: SalesHub click → Google OAuth login flow', async ({ page }) => {
  console.log('🚀 Starting E2E test: SalesHub → Google OAuth\n');

  // 1. 허브 선택 페이지 접속
  console.log('1️⃣ Navigating to staging hubs page...');
  await page.goto('https://staging.workhub.biz:4400/hubs', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  await page.waitForSelector('text=Sales Hub', { timeout: 10000 });
  console.log('✅ Hubs page loaded\n');

  // 스크린샷 1: 허브 선택 페이지
  await page.screenshot({
    path: '/home/peterchung/HWTestAgent/test-results/e2e-1-hubs-page.png',
    fullPage: true
  });

  // 2. Sales Hub 클릭
  console.log('2️⃣ Clicking Sales Hub card...');
  const salesHubButton = page.locator('text=대시보드로 이동').first();
  await expect(salesHubButton).toBeVisible();

  await salesHubButton.click();
  console.log('✅ Sales Hub clicked\n');

  // 3. Google OAuth 페이지로 리디렉션 대기
  console.log('3️⃣ Waiting for Google OAuth redirect...');
  await page.waitForURL(/accounts\.google\.com/, { timeout: 10000 });
  console.log('✅ Redirected to Google OAuth\n');

  const currentUrl = page.url();
  console.log(`Current URL: ${currentUrl.substring(0, 100)}...`);

  // 스크린샷 2: Google OAuth 로그인 페이지
  await page.screenshot({
    path: '/home/peterchung/HWTestAgent/test-results/e2e-2-google-oauth.png',
    fullPage: true
  });

  // 4. Google OAuth 페이지 요소 확인
  console.log('\n4️⃣ Verifying Google OAuth page elements...');

  // Google 로고 확인
  const hasGoogleElements = await page.evaluate(() => {
    const body = document.body.innerHTML;
    return {
      hasGoogleLogo: body.includes('Google') || body.includes('google'),
      hasSignIn: body.includes('Sign in') || body.includes('로그인') || body.includes('identifier'),
      hasEmailInput: !!document.querySelector('input[type="email"]'),
    };
  });

  console.log('Google OAuth page elements:');
  console.log(`  - Has Google branding: ${hasGoogleElements.hasGoogleLogo}`);
  console.log(`  - Has Sign in text: ${hasGoogleElements.hasSignIn}`);
  console.log(`  - Has email input: ${hasGoogleElements.hasEmailInput}`);

  // 5. URL 파라미터 검증
  console.log('\n5️⃣ Verifying OAuth parameters...');
  const url = new URL(page.url());

  const oauthParams = {
    hasClientId: url.searchParams.has('client_id'),
    hasRedirectUri: url.searchParams.has('redirect_uri'),
    hasScope: url.searchParams.has('scope'),
    hasState: url.searchParams.has('state'),
    clientId: url.searchParams.get('client_id')?.substring(0, 20) + '...',
    redirectUri: url.searchParams.get('redirect_uri'),
    scope: url.searchParams.get('scope'),
  };

  console.log('OAuth Parameters:');
  console.log(`  - client_id: ${oauthParams.clientId}`);
  console.log(`  - redirect_uri: ${oauthParams.redirectUri}`);
  console.log(`  - scope: ${oauthParams.scope}`);
  console.log(`  - state: ${url.searchParams.has('state') ? 'present' : 'missing'}`);

  // 검증
  expect(page.url()).toContain('accounts.google.com');
  expect(oauthParams.hasClientId).toBeTruthy();
  expect(oauthParams.hasRedirectUri).toBeTruthy();
  expect(oauthParams.redirectUri).toContain('staging.workhub.biz:4400');
  expect(oauthParams.hasScope).toBeTruthy();
  expect(oauthParams.scope).toContain('email');
  expect(oauthParams.hasState).toBeTruthy();

  console.log('\n✅ All OAuth parameters verified!');
  console.log('\n🎉 E2E Test Passed: SalesHub → Google OAuth flow works correctly!');
});
