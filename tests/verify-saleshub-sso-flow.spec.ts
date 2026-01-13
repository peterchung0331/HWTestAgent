import { test, expect } from '@playwright/test';

test('Verify SalesHub SSO flow - HubManager to SalesHub Dashboard', async ({ page }) => {
  // 콘솔 로그 캡처
  page.on('console', msg => {
    console.log(`[Browser ${msg.type()}] ${msg.text()}`);
  });

  // 네트워크 모니터링
  page.on('request', request => {
    if (request.url().includes('generate-hub-token') || request.url().includes('auth/')) {
      console.log(`[Request] ${request.method()} ${request.url()}`);
    }
  });

  page.on('response', async response => {
    if (response.url().includes('generate-hub-token') || response.url().includes('auth/')) {
      console.log(`[Response] ${response.status()} ${response.url()}`);
      if (response.url().includes('generate-hub-token')) {
        try {
          const body = await response.json();
          console.log('[Token Response]', JSON.stringify(body, null, 2));
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
    }
  });

  console.log('Step 1: Navigate to HubManager hubs page');
  await page.goto('http://localhost:3090/hubs');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/tmp/01-hubmanager-hubs.png', fullPage: true });

  console.log('Step 2: Find Sales Hub card');
  const salesHubCard = page.locator('h3:has-text("Sales Hub")').first();
  await expect(salesHubCard).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: '/tmp/02-before-click.png', fullPage: true });

  console.log('Step 3: Click Sales Hub card');
  await salesHubCard.click();

  console.log('Step 4: Wait for redirect to SalesHub (3010)');
  await page.waitForTimeout(3000);

  // Wait for SSO redirect and authentication
  console.log('Step 5: Waiting for SSO authentication and dashboard redirect...');
  await page.waitForURL('http://localhost:3010/', { timeout: 15000 });

  const finalUrl = page.url();
  console.log(`Final URL: ${finalUrl}`);
  await page.screenshot({ path: '/tmp/03-dashboard.png', fullPage: true });

  // Dashboard에 도달했는지 확인
  expect(finalUrl).toBe('http://localhost:3010/');
  console.log('✅ Successfully reached SalesHub dashboard!');

  // Dashboard 요소 확인 (heading으로 명확히 지정)
  await expect(page.locator('h1:has-text("대시보드")')).toBeVisible({ timeout: 5000 });
  console.log('✅ Dashboard content loaded');

  await page.screenshot({ path: '/tmp/04-dashboard-loaded.png', fullPage: true });
});
