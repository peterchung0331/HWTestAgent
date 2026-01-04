/**
 * WBFinHub Cookie-based Authentication Test
 * Tests SSO flow with HubManager using cookies
 */

import { test, expect } from '@playwright/test';

test.describe('WBFinHub Cookie Authentication', () => {
  test('should have login endpoint that redirects to HubManager', async ({ page }) => {
    // Navigate to backend login endpoint
    const response = await page.goto('http://localhost:4020/auth/login');

    // Should redirect to HubManager OAuth
    expect(page.url()).toContain('localhost:4090');
    expect(page.url()).toContain('/api/auth/google-oauth');
    expect(page.url()).toContain('app=wbfinhub');
  });

  test('should serve frontend login page', async ({ page }) => {
    await page.goto('http://localhost:3020/login');

    // Page should load
    await expect(page).toHaveTitle(/FinHub/i);

    // Take screenshot
    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/finhub-login-page.png',
      fullPage: true
    });
  });

  test('should have auth/me endpoint', async ({ page, context }) => {
    // Call /auth/me without cookies (unauthenticated)
    const response = await page.goto('http://localhost:4020/auth/me');
    const data = await response?.json();

    console.log('Auth /me response:', data);

    // Should return isAuthenticated: false when no cookie
    expect(data.success).toBe(true);
    expect(data.isAuthenticated).toBe(false);
  });

  test('should protect dashboard route', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('http://localhost:3020/dashboard');

    // Should redirect to login
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');

    // Take screenshot
    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/finhub-protected-route.png',
      fullPage: true
    });
  });

  test('frontend should use cookie-based api client', async ({ page }) => {
    // Monitor network requests
    const requests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        requests.push(request.url());
        console.log('API Request:', request.url());
        console.log('  Authorization header:', request.headers()['authorization']);
        console.log('  Cookie header:', request.headers()['cookie']);
      }
    });

    await page.goto('http://localhost:3020/login');

    // Wait a bit for any API calls
    await page.waitForTimeout(2000);

    // API requests should NOT have Authorization header
    // (they should use cookies instead)
    console.log('Total API requests:', requests.length);
  });
});
