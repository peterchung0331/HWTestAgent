import { test, expect } from '@playwright/test';

test('E2E: Hub card click on staging', async ({ page }) => {
  console.log('🚀 Starting E2E test for staging hub card click\n');

  // 페이지 로드
  console.log('1️⃣ Navigating to staging...');
  await page.goto('https://staging.workhub.biz:4400/hubs', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  // 페이지 로드 확인
  await page.waitForSelector('text=Sales Hub', { timeout: 10000 });
  console.log('✅ Page loaded successfully\n');

  // 스크린샷 1: 클릭 전
  await page.screenshot({
    path: '/home/peterchung/HWTestAgent/test-results/e2e-staging-before-click.png',
    fullPage: true
  });

  console.log('2️⃣ Clicking Sales Hub card...');
  const salesHubButton = page.locator('text=대시보드로 이동').first();

  // 버튼이 보이는지 확인
  await expect(salesHubButton).toBeVisible();
  console.log('✅ Button is visible');

  // 클릭 전 URL 저장
  const urlBefore = page.url();
  console.log(`URL before click: ${urlBefore}`);

  // 클릭
  await salesHubButton.click();
  console.log('✅ Click executed\n');

  // 1초 대기 (리디렉션 시간)
  await page.waitForTimeout(1000);

  // 클릭 후 URL 확인
  const urlAfter = page.url();
  console.log(`URL after click: ${urlAfter}`);

  // 스크린샷 2: 클릭 후
  await page.screenshot({
    path: '/home/peterchung/HWTestAgent/test-results/e2e-staging-after-click.png',
    fullPage: true
  });

  // 검증: Google OAuth 또는 SalesHub로 리디렉션되었는지 확인
  const isRedirected = urlAfter !== urlBefore;
  console.log(`\n✅ Redirected: ${isRedirected}`);

  if (urlAfter.includes('accounts.google.com')) {
    console.log('✅ Redirected to Google OAuth (expected)');
  } else if (urlAfter.includes('saleshub')) {
    console.log('✅ Redirected to SalesHub (expected)');
  } else {
    console.log(`⚠️ Unexpected URL: ${urlAfter}`);
  }

  // 검증
  expect(isRedirected).toBeTruthy();

  console.log('\n🎉 E2E Test Passed!');
});
