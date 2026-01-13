import { test, expect } from '@playwright/test';

test('HubManager Admin Banners Page with dev-login', async ({ page }) => {
  // 네트워크 및 콘솔 모니터링
  page.on('requestfailed', request => {
    console.log('❌ Request failed:', request.url());
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Console Error:', msg.text());
    } else if (msg.text().includes('token')) {
      console.log('🔍', msg.text());
    }
  });

  // 1. dev-login 엔드포인트로 인증 쿠키 설정
  console.log('📍 Step 1: dev-login to get authentication cookies');
  const loginResponse = await page.goto('http://localhost:4090/api/auth/dev-login');
  expect(loginResponse?.status()).toBe(200);
  console.log('✅ Dev-login successful');

  // 쿠키 확인
  const cookies = await page.context().cookies();
  const accessTokenCookie = cookies.find(c => c.name === 'wbhub_access_token');
  console.log('🍪 Access token cookie:', accessTokenCookie ? 'Found' : 'Not found');

  // 2. HubManager 홈페이지로 이동
  console.log('📍 Step 2: Navigate to HubManager home');
  await page.goto('http://localhost:3090');
  await page.waitForLoadState('networkidle');
  console.log('✅ Homepage loaded');

  // 3. Admin Banners 페이지로 이동
  console.log('📍 Step 3: Navigate to /admin/banners');
  await page.goto('http://localhost:3090/admin/banners');
  await page.waitForLoadState('networkidle');

  // 스크린샷 저장
  await page.screenshot({ path: '/home/peterchung/HWTestAgent/test-results/admin-banners-debug.png', fullPage: true });
  console.log('📸 Screenshot saved');

  // 4. 페이지 상태 확인
  const title = await page.title();
  console.log('📄 Page title:', title);

  // API 요청 확인
  const apiResponse = await page.waitForResponse(
    response => response.url().includes('/api/banners') && response.request().method() === 'GET',
    { timeout: 10000 }
  ).catch(() => null);

  if (apiResponse) {
    const status = apiResponse.status();
    console.log('📡 API Response Status:', status);
    if (status === 200) {
      const data = await apiResponse.json();
      console.log('✅ Banner API Success:', JSON.stringify(data, null, 2));
    } else {
      const text = await apiResponse.text();
      console.log('❌ API Error:', text);
    }
  } else {
    console.log('⚠️ No API response received');
  }

  // 5. 배너 관리 페이지 요소 확인
  const hasHeading = await page.locator('h1, h2').filter({ hasText: /배너 관리|Banner/i }).count();
  console.log('📋 Banner Management Heading:', hasHeading > 0 ? 'Found' : 'Not found');

  // 테스트 완료
  console.log('✅ Test completed');
});
