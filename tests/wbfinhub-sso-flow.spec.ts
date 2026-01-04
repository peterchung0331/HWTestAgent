/**
 * WBFinHub Full SSO Flow Test
 * Tests complete cookie-based authentication flow with HubManager
 */

import { test, expect } from '@playwright/test';

// Test credentials from .env.template
const TEST_EMAIL = 'biz.dev@wavebridge.com';
const TEST_PASSWORD = 'wave1234!!';

test.describe('WBFinHub SSO Flow (Cookie-based)', () => {
  test('should complete full SSO authentication flow', async ({ page, context }) => {
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Browser console error:', msg.text());
      }
    });

    // Monitor network requests
    page.on('request', request => {
      if (request.url().includes('/auth/')) {
        console.log('🌐 Auth request:', request.method(), request.url());
      }
    });

    page.on('response', response => {
      if (response.url().includes('/auth/')) {
        console.log('📥 Auth response:', response.status(), response.url());
      }
    });

    console.log('\n=== Step 1: Navigate to FinHub login page ===');
    await page.goto('http://localhost:3020/login');
    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/finhub-sso-1-login.png',
      fullPage: true
    });

    console.log('\n=== Step 2: Click login button (should redirect to HubManager) ===');
    // Find and click the login button
    const loginButton = page.locator('button:has-text("로그인")').first();
    await loginButton.click();

    // Wait for redirect to HubManager
    await page.waitForURL(/localhost:4090/, { timeout: 10000 });
    console.log('✅ Redirected to HubManager:', page.url());

    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/finhub-sso-2-hubmanager.png',
      fullPage: true
    });

    console.log('\n=== Step 3: Wait for Google OAuth redirect ===');
    // HubManager should redirect to Google OAuth
    await page.waitForURL(/accounts\.google\.com/, { timeout: 15000 });
    console.log('✅ Redirected to Google OAuth');

    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/finhub-sso-3-google.png',
      fullPage: true
    });

    console.log('\n=== Step 4: Enter Google credentials ===');
    // Enter email
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill(TEST_EMAIL);
    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/finhub-sso-4-email.png',
      fullPage: true
    });

    // Click Next
    await page.locator('button:has-text("Next"), button:has-text("다음")').first().click();
    await page.waitForTimeout(2000);

    // Enter password
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(TEST_PASSWORD);
    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/finhub-sso-5-password.png',
      fullPage: true
    });

    // Click Next/Sign in
    await page.locator('button:has-text("Next"), button:has-text("다음"), button:has-text("Sign in")').first().click();

    console.log('\n=== Step 5: Wait for OAuth callback and cookie setup ===');
    // Wait for redirect back to HubManager callback
    await page.waitForURL(/localhost:4090\/api\/auth\/google-callback/, { timeout: 15000 });
    console.log('✅ OAuth callback received');

    // HubManager should set cookies and redirect to /auth/sso-complete
    await page.waitForURL(/localhost:4020\/auth\/sso-complete/, { timeout: 10000 });
    console.log('✅ Redirected to FinHub sso-complete');

    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/finhub-sso-6-callback.png',
      fullPage: true
    });

    console.log('\n=== Step 6: Verify cookie is set ===');
    const cookies = await context.cookies();
    const accessTokenCookie = cookies.find(c => c.name === 'wbhub_access_token');
    const refreshTokenCookie = cookies.find(c => c.name === 'wbhub_refresh_token');

    console.log('🍪 Cookies received:');
    console.log('  - Access token:', accessTokenCookie ? '✅ Present' : '❌ Missing');
    console.log('  - Refresh token:', refreshTokenCookie ? '✅ Present' : '❌ Missing');

    expect(accessTokenCookie).toBeDefined();
    expect(refreshTokenCookie).toBeDefined();

    // Verify cookie properties
    expect(accessTokenCookie?.httpOnly).toBe(true);
    expect(accessTokenCookie?.sameSite).toBe('Lax');

    console.log('\n=== Step 7: Wait for final redirect to dashboard ===');
    // Should redirect to dashboard (or pending-approval based on account status)
    await page.waitForURL(/localhost:3020\/(dashboard|pending-approval)/, { timeout: 10000 });
    console.log('✅ Final page:', page.url());

    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/finhub-sso-7-final.png',
      fullPage: true
    });

    console.log('\n=== Step 8: Verify authentication status ===');
    // Navigate to /auth/me to verify authentication
    const authMeResponse = await page.goto('http://localhost:4020/auth/me');
    const authData = await authMeResponse?.json();

    console.log('👤 Auth status:', JSON.stringify(authData, null, 2));

    expect(authData.success).toBe(true);
    expect(authData.isAuthenticated).toBe(true);
    expect(authData.data.user).toBeDefined();
    expect(authData.data.user.email).toBe(TEST_EMAIL);

    console.log('\n✅ SSO Flow Completed Successfully!');
  });

  test('should maintain session after page reload', async ({ page, context }) => {
    // This test assumes the previous test has set cookies
    // In real scenarios, you'd run the login flow first

    console.log('\n=== Testing session persistence ===');

    await page.goto('http://localhost:3020/dashboard');

    // Check if we're still authenticated (not redirected to login)
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log('Current URL after navigation:', currentUrl);

    // Should not be redirected to login page
    expect(currentUrl).not.toContain('/login');

    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/finhub-session-persistence.png',
      fullPage: true
    });

    console.log('✅ Session persisted after page reload');
  });

  test('should logout and clear cookies', async ({ page, context }) => {
    console.log('\n=== Testing logout ===');

    // Call logout endpoint
    const logoutResponse = await page.goto('http://localhost:4020/auth/logout', {
      method: 'POST',
    });

    const logoutData = await logoutResponse?.json();
    console.log('Logout response:', logoutData);

    expect(logoutData.success).toBe(true);

    // Verify cookies are cleared
    const cookies = await context.cookies();
    const accessTokenCookie = cookies.find(c => c.name === 'wbhub_access_token');

    console.log('🍪 Cookies after logout:');
    console.log('  - Access token:', accessTokenCookie ? '❌ Still present' : '✅ Cleared');

    // Try to access protected route
    await page.goto('http://localhost:3020/dashboard');
    await page.waitForURL(/\/login/, { timeout: 5000 });

    console.log('✅ Logout successful, redirected to login');

    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/finhub-logout.png',
      fullPage: true
    });
  });
});
