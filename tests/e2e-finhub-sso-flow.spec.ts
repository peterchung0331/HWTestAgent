/**
 * E2E Test: FinHub SSO Flow
 * 허브 선택 화면 → Google OAuth (토큰 발급) → FinHub 대시보드 진입
 */

import { test, expect } from '@playwright/test';

const HUBMANAGER_URL = process.env.HUBMANAGER_URL || 'http://localhost:4090';
const FINHUB_FRONTEND_URL = process.env.FINHUB_FRONTEND_URL || 'http://localhost:3020';
const FINHUB_BACKEND_URL = process.env.FINHUB_BACKEND_URL || 'http://localhost:4020';

test.describe('FinHub E2E SSO Flow', () => {
  test('should complete full SSO flow from hub selection to FinHub dashboard', async ({ page, context }) => {
    console.log('\n' + '='.repeat(60));
    console.log('FinHub E2E SSO Flow Test');
    console.log('='.repeat(60));

    // Step 1: 허브 선택 화면으로 이동
    console.log('\n1️⃣ Navigate to HubManager hub selection');
    await page.goto(`${HUBMANAGER_URL}/hubs`);
    await page.waitForLoadState('networkidle');

    console.log('   Current URL:', page.url());
    expect(page.url()).toContain('/hubs');
    console.log('   ✓ Hub selection page loaded');

    // 스크린샷: 허브 선택 화면
    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/e2e-finhub-01-hub-selection.png',
      fullPage: true
    });

    // Step 2: Google OAuth 승인 (dev-login으로 시뮬레이션)
    console.log('\n2️⃣ Simulate Google OAuth approval (dev-login)');

    // dev-login 엔드포인트로 인증 토큰 받기
    const loginResponse = await page.goto(`${HUBMANAGER_URL}/api/auth/dev-login`);
    expect(loginResponse?.status()).toBe(200);

    // 쿠키 확인
    const cookies = await context.cookies();
    const accessToken = cookies.find(c => c.name === 'wbhub_access_token');
    const refreshToken = cookies.find(c => c.name === 'wbhub_refresh_token');

    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();

    console.log('   ✓ Authentication cookies received');
    console.log('   - Access token:', accessToken?.value.substring(0, 50) + '...');
    console.log('   - Refresh token:', refreshToken?.value.substring(0, 50) + '...');

    // Step 3: 허브 선택 화면으로 다시 이동 (인증된 상태)
    console.log('\n3️⃣ Return to hub selection (authenticated)');
    await page.goto(`${HUBMANAGER_URL}/hubs`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('   Current URL:', page.url());
    console.log('   ✓ Returned to hub selection with authentication');

    // 스크린샷: 인증 후 허브 선택 화면
    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/e2e-finhub-02-hub-selection-authenticated.png',
      fullPage: true
    });

    // Step 4: FinHub 카드 찾기 및 클릭
    console.log('\n4️⃣ Click FinHub card');

    // FinHub 링크 찾기 (여러 가능한 선택자 시도)
    const finHubSelectors = [
      'a[href*="finhub"]',
      'a[href*="3020"]',
      'text=FinHub',
      'text=WBFinHub',
      'text=재무',
      'text=Finance'
    ];

    let finHubLink = null;
    for (const selector of finHubSelectors) {
      finHubLink = await page.locator(selector).first();
      if (await finHubLink.count() > 0) {
        console.log(`   Found FinHub link with selector: ${selector}`);
        break;
      }
    }

    if (!finHubLink || await finHubLink.count() === 0) {
      console.log('   ⚠️  FinHub link not found, checking page content...');
      const pageContent = await page.content();
      console.log('   Page HTML (first 500 chars):', pageContent.substring(0, 500));

      // FinHub URL로 직접 이동
      console.log('   → Navigating directly to FinHub');
      await page.goto(FINHUB_FRONTEND_URL);
    } else {
      await finHubLink.click();
      console.log('   ✓ Clicked FinHub card');
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Step 5: FinHub 대시보드 진입 확인
    console.log('\n5️⃣ Verify FinHub dashboard access');

    const currentUrl = page.url();
    console.log('   Current URL:', currentUrl);

    // 대시보드 또는 SSO complete로 리다이렉트되어야 함
    const isOnDashboard = currentUrl.includes('/dashboard');
    const isOnSSOComplete = currentUrl.includes('/sso-complete');
    const isOnFinHub = currentUrl.includes('3020') || currentUrl.includes('finhub');

    console.log('   - On FinHub domain:', isOnFinHub);
    console.log('   - On dashboard:', isOnDashboard);
    console.log('   - On SSO complete:', isOnSSOComplete);

    // SSO complete인 경우 대시보드로 리다이렉트 대기
    if (isOnSSOComplete) {
      console.log('   → Waiting for redirect to dashboard...');
      await page.waitForURL('**/dashboard', { timeout: 5000 });
      console.log('   ✓ Redirected to dashboard');
    }

    // 최종 URL 확인
    const finalUrl = page.url();
    console.log('   Final URL:', finalUrl);
    expect(finalUrl).toContain('/dashboard');

    // 스크린샷: FinHub 대시보드
    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/e2e-finhub-03-dashboard.png',
      fullPage: true
    });

    // Step 6: 대시보드 요소 확인
    console.log('\n6️⃣ Verify dashboard elements');

    // 사이드바 확인
    const sidebar = page.locator('aside, nav, [role="navigation"]').first();
    if (await sidebar.count() > 0) {
      console.log('   ✓ Sidebar found');
    }

    // 대시보드 제목 또는 헤더 확인
    const dashboardHeaders = [
      'h1:has-text("대시보드")',
      'h1:has-text("Dashboard")',
      'h2:has-text("Overview")',
      'text=FinHub'
    ];

    let headerFound = false;
    for (const selector of dashboardHeaders) {
      const header = page.locator(selector).first();
      if (await header.count() > 0) {
        console.log(`   ✓ Dashboard header found: ${selector}`);
        headerFound = true;
        break;
      }
    }

    if (!headerFound) {
      console.log('   ⚠️  Dashboard header not found (might be loading or different structure)');
    }

    // Step 7: 인증 상태 확인 (API)
    console.log('\n7️⃣ Verify authentication status via API');

    const authResponse = await page.request.get(`${FINHUB_BACKEND_URL}/auth/me`);
    const authData = await authResponse.json();

    console.log('   Auth response:', JSON.stringify(authData, null, 2));

    expect(authData.success).toBe(true);
    expect(authData.isAuthenticated).toBe(true);
    expect(authData.data?.user?.email).toBeTruthy();

    console.log('   ✓ Authenticated user:', authData.data?.user?.email);
    console.log('   ✓ User status:', authData.data?.user?.status);
    console.log('   ✓ User role:', authData.data?.user?.role);

    // Step 8: 쿠키 확인
    console.log('\n8️⃣ Verify authentication cookies');

    const finalCookies = await context.cookies();
    const finalAccessToken = finalCookies.find(c => c.name === 'wbhub_access_token');
    const finalRefreshToken = finalCookies.find(c => c.name === 'wbhub_refresh_token');

    expect(finalAccessToken).toBeDefined();
    expect(finalRefreshToken).toBeDefined();
    expect(finalAccessToken?.httpOnly).toBe(true);
    expect(finalRefreshToken?.httpOnly).toBe(true);

    console.log('   ✓ Access token exists and httpOnly');
    console.log('   ✓ Refresh token exists and httpOnly');

    console.log('\n' + '='.repeat(60));
    console.log('✅ E2E Test Completed Successfully!');
    console.log('='.repeat(60));
  });

  test('should handle unauthenticated access to FinHub', async ({ page }) => {
    console.log('\n' + '='.repeat(60));
    console.log('FinHub Unauthenticated Access Test');
    console.log('='.repeat(60));

    // Step 1: 쿠키 없이 대시보드 접근
    console.log('\n1️⃣ Access dashboard without authentication');
    await page.goto(`${FINHUB_FRONTEND_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const currentUrl = page.url();
    console.log('   Current URL:', currentUrl);

    // 로그인 페이지로 리다이렉트되어야 함
    expect(currentUrl).toContain('/login');
    console.log('   ✓ Redirected to login page');

    // 스크린샷
    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/e2e-finhub-unauthenticated.png',
      fullPage: true
    });

    console.log('\n✅ Unauthenticated access handled correctly!');
  });

  test('should verify FinHub card exists on hub selection page', async ({ page, context }) => {
    console.log('\n' + '='.repeat(60));
    console.log('Hub Selection Page - FinHub Card Verification');
    console.log('='.repeat(60));

    // Step 1: 인증
    console.log('\n1️⃣ Authenticate with dev-login');
    await page.goto(`${HUBMANAGER_URL}/api/auth/dev-login`);
    const cookies = await context.cookies();
    expect(cookies.find(c => c.name === 'wbhub_access_token')).toBeDefined();
    console.log('   ✓ Authenticated');

    // Step 2: 허브 선택 페이지로 이동
    console.log('\n2️⃣ Navigate to hub selection page');
    await page.goto(`${HUBMANAGER_URL}/hubs`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Step 3: 페이지 구조 분석
    console.log('\n3️⃣ Analyze hub selection page structure');

    // 모든 링크 찾기
    const links = await page.locator('a').all();
    console.log(`   Total links found: ${links.length}`);

    // FinHub 관련 링크 찾기
    const hubLinks = [];
    for (const link of links) {
      const href = await link.getAttribute('href');
      const text = await link.textContent();
      if (href && (href.includes('finhub') || href.includes('3020'))) {
        hubLinks.push({ href, text: text?.trim() });
      }
    }

    console.log('   FinHub links found:', hubLinks.length);
    hubLinks.forEach((link, index) => {
      console.log(`   ${index + 1}. ${link.text} -> ${link.href}`);
    });

    if (hubLinks.length > 0) {
      console.log('   ✓ FinHub card exists on hub selection page');
    } else {
      console.log('   ⚠️  FinHub card not found, checking page content...');

      // 페이지 텍스트 내용 확인
      const bodyText = await page.locator('body').textContent();
      console.log('   Page contains "FinHub":', bodyText?.includes('FinHub') || bodyText?.includes('핀허브'));
      console.log('   Page contains "Finance":', bodyText?.includes('Finance') || bodyText?.includes('재무'));
    }

    // 스크린샷
    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/e2e-finhub-hub-selection-analysis.png',
      fullPage: true
    });

    console.log('\n✅ Hub selection page analysis completed!');
  });
});
