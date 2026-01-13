import { test, expect } from '@playwright/test';

test('Simple banner page test', async ({ page }) => {
  // 1. Dev-login
  await page.goto('http://localhost:4090/api/auth/dev-login');
  await page.waitForTimeout(1000);

  // 2. Go to banners page
  await page.goto('http://localhost:3090/admin/banners');

  // Wait longer for page to fully load
  await page.waitForTimeout(5000);

  // Take screenshot
  await page.screenshot({
    path: '/home/peterchung/HWTestAgent/test-results/banner-simple.png',
    fullPage: true
  });

  // Get page HTML
  const html = await page.content();
  console.log('Page loaded');
  console.log('Has "배너 관리":', html.includes('배너 관리'));
  console.log('Has "Banner":', html.includes('Banner'));

  // Try to find any text on the page
  const bodyText = await page.locator('body').textContent();
  console.log('Body text length:', bodyText?.length || 0);
  console.log('First 500 chars:', bodyText?.substring(0, 500));
});
