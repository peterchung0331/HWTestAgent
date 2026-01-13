import { test, expect } from '@playwright/test';

test('Debug SalesHub redirect issue', async ({ page }) => {
  // 콘솔 로그 캡처
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });

  // 네트워크 요청 모니터링
  page.on('request', request => {
    if (request.url().includes('generate-hub-token') || request.url().includes('auth/sso')) {
      console.log(`[Request] ${request.method()} ${request.url()}`);
    }
  });

  page.on('response', async response => {
    if (response.url().includes('generate-hub-token')) {
      console.log(`[Response] ${response.status()} ${response.url()}`);
      try {
        const body = await response.json();
        console.log('[Response Body]', JSON.stringify(body, null, 2));
      } catch (e) {
        console.log('[Response] Could not parse JSON');
      }
    }
  });

  console.log('Step 1: Navigate to HubManager hubs page');
  await page.goto('http://localhost:3090/hubs');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/tmp/01-hubs-page.png', fullPage: true });

  console.log('Step 2: Find and click Sales Hub card');
  const salesHubCard = await page.locator('h3:has-text("Sales Hub")').first();
  await expect(salesHubCard).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: '/tmp/02-before-click.png', fullPage: true });

  console.log('Step 3: Click Sales Hub');
  await salesHubCard.click();

  console.log('Step 4: Wait for navigation');
  await page.waitForTimeout(3000);

  const currentUrl = page.url();
  console.log(`Current URL: ${currentUrl}`);
  await page.screenshot({ path: '/tmp/03-after-click.png', fullPage: true });

  // URL이 바뀌었는지 확인
  if (currentUrl.includes('localhost:3010')) {
    console.log('✅ Successfully redirected to SalesHub (3010)');

    // sso-callback 페이지인지 확인
    if (currentUrl.includes('sso-callback')) {
      console.log('📍 On sso-callback page, waiting for dashboard redirect...');
      await page.waitForTimeout(5000);

      const finalUrl = page.url();
      console.log(`Final URL: ${finalUrl}`);
      await page.screenshot({ path: '/tmp/04-final-page.png', fullPage: true });

      if (finalUrl === 'http://localhost:3010/' || finalUrl.includes('/dashboard')) {
        console.log('✅ Successfully reached dashboard!');
      } else {
        console.log('❌ Still stuck on sso-callback page');
      }
    }
  } else if (currentUrl.includes('localhost:4010')) {
    console.log('❌ ERROR: Redirected to backend port 4010 instead of frontend 3010');
  } else {
    console.log(`❌ ERROR: Still on ${currentUrl}`);
  }
});
