/**
 * FinHub - HubManager SSO Cookie Authentication Integration Test
 * HubManager에서 쿠키 설정 후 FinHub에서 인증 검증
 */

import { test, expect } from '@playwright/test';

const HUBMANAGER_URL = 'http://localhost:4090';
const FINHUB_BACKEND_URL = 'http://localhost:4020';
const FINHUB_FRONTEND_URL = 'http://localhost:3020';

test.describe('FinHub-HubManager Cookie Authentication Integration', () => {
  test('should authenticate using HubManager test endpoint and access FinHub', async ({ page, context }) => {
    console.log('\n=== Step 1: Get authentication from HubManager ===');

    // HubManager의 dev-login 엔드포인트로 직접 인증
    const loginResponse = await page.goto(`${HUBMANAGER_URL}/api/auth/dev-login`);

    console.log('Login response status:', loginResponse?.status());

    // 쿠키 확인
    const cookies = await context.cookies();
    console.log('\n=== Cookies after HubManager login ===');
    cookies.forEach(cookie => {
      console.log(`${cookie.name}: ${cookie.value.substring(0, 50)}...`);
    });

    const accessTokenCookie = cookies.find(c => c.name === 'wbhub_access_token');
    const refreshTokenCookie = cookies.find(c => c.name === 'wbhub_refresh_token');

    expect(accessTokenCookie).toBeDefined();
    console.log('✅ Access token cookie received from HubManager');

    console.log('\n=== Step 2: Test FinHub /auth/me with HubManager cookies ===');

    // FinHub의 /auth/me 엔드포인트 호출
    const authMeResponse = await page.goto(`${FINHUB_BACKEND_URL}/auth/me`);
    const authData = await authMeResponse?.json();

    console.log('FinHub /auth/me response:', JSON.stringify(authData, null, 2));

    // 인증 성공 확인
    expect(authData.success).toBe(true);
    expect(authData.isAuthenticated).toBe(true);
    expect(authData.data?.user).toBeDefined();
    expect(authData.data?.user?.email).toBeTruthy();

    console.log('✅ FinHub successfully authenticated with HubManager cookies');
    console.log('   User:', authData.data?.user?.email);

    console.log('\n=== Step 3: Test FinHub protected API endpoint ===');

    // FinHub의 보호된 엔드포인트 테스트 (예: /api/dashboard)
    const dashboardResponse = await page.goto(`${FINHUB_BACKEND_URL}/api/dashboard/overview`);

    console.log('Dashboard API status:', dashboardResponse?.status());

    if (dashboardResponse?.status() === 200) {
      const dashboardData = await dashboardResponse.json();
      console.log('✅ Protected API accessible');
      console.log('   Dashboard data received:', Object.keys(dashboardData));
    }

    console.log('\n=== Step 4: Test FinHub frontend with cookies ===');

    // FinHub 프론트엔드 대시보드 접근
    await page.goto(`${FINHUB_FRONTEND_URL}/dashboard`);

    // 로그인 페이지로 리다이렉트되지 않고 대시보드가 로드되어야 함
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    // 대시보드에 있어야 함 (로그인으로 리다이렉트되지 않음)
    expect(currentUrl).toContain('/dashboard');
    expect(currentUrl).not.toContain('/login');

    console.log('✅ Frontend dashboard accessible with cookies');

    // 스크린샷
    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/integration-finhub-dashboard.png',
      fullPage: true
    });

    console.log('\n=== Step 5: Test logout ===');

    // 로그아웃 (POST 요청)
    const logoutResponse = await page.request.post(`${FINHUB_BACKEND_URL}/auth/logout`);

    const logoutData = await logoutResponse.json();
    console.log('Logout response:', logoutData);

    expect(logoutData.success).toBe(true);

    // 쿠키 확인 (삭제되어야 함)
    const cookiesAfterLogout = await context.cookies();
    const accessTokenAfterLogout = cookiesAfterLogout.find(c => c.name === 'wbhub_access_token');

    console.log('Access token after logout:', accessTokenAfterLogout ? 'Still exists' : 'Cleared');

    console.log('\n✅ Integration test completed successfully!');
  });

  test('should verify token from HubManager is valid in FinHub', async ({ page, context }) => {
    console.log('\n=== Token Verification Test ===');

    // 1. HubManager에서 토큰 받기
    await page.goto(`${HUBMANAGER_URL}/api/auth/dev-login`);

    const cookies = await context.cookies();
    const accessToken = cookies.find(c => c.name === 'wbhub_access_token');

    expect(accessToken).toBeDefined();
    console.log('Access token received (length):', accessToken?.value.length);

    // 2. 토큰의 payload 확인 (JWT decode)
    if (accessToken) {
      const payload = JSON.parse(
        Buffer.from(accessToken.value.split('.')[1], 'base64').toString()
      );

      console.log('\nJWT Payload:');
      console.log('  - sub:', payload.sub);
      console.log('  - email:', payload.email);
      console.log('  - issuer:', payload.iss);
      console.log('  - audience:', payload.aud);
      console.log('  - issued at:', new Date(payload.iat * 1000).toISOString());
      console.log('  - expires at:', new Date(payload.exp * 1000).toISOString());

      expect(payload.iss).toBe('wbhubmanager');
      expect(payload.aud).toContain('wbfinhub');
    }

    // 3. FinHub에서 토큰 검증
    const authResponse = await page.goto(`${FINHUB_BACKEND_URL}/auth/me`);
    const authData = await authResponse?.json();

    console.log('\nFinHub verification result:');
    console.log('  - isAuthenticated:', authData.isAuthenticated);
    console.log('  - user email:', authData.data?.user?.email);

    expect(authData.isAuthenticated).toBe(true);

    console.log('\n✅ Token verification successful');
  });

  test('should handle expired or invalid tokens gracefully', async ({ page, context }) => {
    console.log('\n=== Invalid Token Test ===');

    // 잘못된 토큰으로 쿠키 설정
    await context.addCookies([{
      name: 'wbhub_access_token',
      value: 'invalid.token.here',
      domain: 'localhost',
      path: '/',
    }]);

    // FinHub /auth/me 호출
    const authResponse = await page.goto(`${FINHUB_BACKEND_URL}/auth/me`);
    const authData = await authResponse?.json();

    console.log('Auth response with invalid token:', authData);

    // 인증 실패 확인
    expect(authData.success).toBe(true);
    expect(authData.isAuthenticated).toBe(false);
    expect(authData.user).toBeNull();

    console.log('✅ Invalid token handled correctly');
  });

  test('should verify cookie properties (httpOnly, secure, sameSite)', async ({ page, context }) => {
    console.log('\n=== Cookie Properties Test ===');

    // HubManager에서 쿠키 받기
    await page.goto(`${HUBMANAGER_URL}/api/auth/dev-login`);

    const cookies = await context.cookies();
    const accessToken = cookies.find(c => c.name === 'wbhub_access_token');
    const refreshToken = cookies.find(c => c.name === 'wbhub_refresh_token');

    console.log('\nAccess Token Cookie Properties:');
    console.log('  - httpOnly:', accessToken?.httpOnly);
    console.log('  - secure:', accessToken?.secure);
    console.log('  - sameSite:', accessToken?.sameSite);
    console.log('  - domain:', accessToken?.domain);
    console.log('  - path:', accessToken?.path);

    // 보안 속성 확인
    expect(accessToken?.httpOnly).toBe(true);
    expect(accessToken?.sameSite).toBe('Lax');
    expect(accessToken?.path).toBe('/');

    console.log('\nRefresh Token Cookie Properties:');
    console.log('  - httpOnly:', refreshToken?.httpOnly);
    console.log('  - secure:', refreshToken?.secure);
    console.log('  - sameSite:', refreshToken?.sameSite);

    expect(refreshToken?.httpOnly).toBe(true);
    expect(refreshToken?.sameSite).toBe('Lax');

    console.log('\n✅ Cookie properties verified');
  });

  test('should test complete SSO flow: login -> access -> logout', async ({ page, context }) => {
    console.log('\n=== Complete SSO Flow Test ===');

    // 1. 초기 상태 (비인증)
    console.log('\n1️⃣ Initial unauthenticated state');
    let authResponse = await page.goto(`${FINHUB_BACKEND_URL}/auth/me`);
    let authData = await authResponse?.json();

    expect(authData.isAuthenticated).toBe(false);
    console.log('   ✓ Not authenticated initially');

    // 2. HubManager를 통한 로그인
    console.log('\n2️⃣ Login through HubManager');
    await page.goto(`${HUBMANAGER_URL}/api/auth/dev-login`);

    const cookies = await context.cookies();
    const accessToken = cookies.find(c => c.name === 'wbhub_access_token');
    expect(accessToken).toBeDefined();
    console.log('   ✓ Received authentication cookies');

    // 3. FinHub 접근
    console.log('\n3️⃣ Access FinHub with cookies');
    authResponse = await page.goto(`${FINHUB_BACKEND_URL}/auth/me`);
    authData = await authResponse?.json();

    expect(authData.isAuthenticated).toBe(true);
    console.log('   ✓ Successfully authenticated in FinHub');
    console.log('   User:', authData.data?.user?.email);

    // 4. 보호된 리소스 접근
    console.log('\n4️⃣ Access protected resources');
    await page.goto(`${FINHUB_FRONTEND_URL}/dashboard`);
    await page.waitForTimeout(1000);

    expect(page.url()).toContain('/dashboard');
    console.log('   ✓ Dashboard accessible');

    // 5. 로그아웃
    console.log('\n5️⃣ Logout');
    const logoutResponse = await page.request.post(`${FINHUB_BACKEND_URL}/auth/logout`);
    const logoutData = await logoutResponse.json();

    expect(logoutData.success).toBe(true);
    console.log('   ✓ Logout successful');

    // 6. 로그아웃 후 상태
    console.log('\n6️⃣ Post-logout state');
    await page.goto(`${FINHUB_FRONTEND_URL}/dashboard`);
    await page.waitForTimeout(1000);

    // 로그인 페이지로 리다이렉트되어야 함
    expect(page.url()).toContain('/login');
    console.log('   ✓ Redirected to login page after logout');

    console.log('\n✅ Complete SSO flow verified!');
  });
});
