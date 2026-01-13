import { test, expect } from '@playwright/test';

test('Debug banner page with console logs', async ({ page }) => {
  // Capture all console logs
  page.on('console', msg => {
    console.log(`[${msg.type()}]`, msg.text());
  });

  // Capture network requests
  page.on('request', request => {
    if (request.url().includes('/api/banners')) {
      console.log('📤 Request:', request.url());
      console.log('   Headers:', request.headers());
    }
  });

  page.on('response', response => {
    if (response.url().includes('/api/banners')) {
      console.log('📥 Response:', response.status(), response.url());
    }
  });

  // 1. Dev-login
  console.log('\n=== Step 1: Dev-login ===');
  await page.goto('http://localhost:4090/api/auth/dev-login');
  await page.waitForTimeout(1000);

  // Check cookies
  const cookies = await page.context().cookies();
  console.log('\n=== Cookies after dev-login ===');
  cookies.forEach(cookie => {
    if (cookie.name.includes('token') || cookie.name.includes('wbhub')) {
      console.log(`  ${cookie.name}: ${cookie.value.substring(0, 50)}...`);
    }
  });

  // 2. Go to banners page
  console.log('\n=== Step 2: Navigate to /admin/banners ===');
  await page.goto('http://localhost:3090/admin/banners');
  await page.waitForTimeout(8000); // Wait longer for all logs

  // Take screenshot
  await page.screenshot({
    path: '/home/peterchung/HWTestAgent/test-results/banner-debug-console.png',
    fullPage: true
  });

  console.log('\n=== Test completed ===');
});
