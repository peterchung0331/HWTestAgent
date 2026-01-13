import { test, expect } from '@playwright/test';

/**
 * Oracle Staging 환경 - API URL 설정 테스트
 * 목적: NEXT_PUBLIC_API_URL이 빌드에 올바르게 포함되었는지 확인
 */

test('API URL 설정 확인', async ({ page }) => {
  console.log('📌 HubManager 메인 페이지 접속');

  // 네트워크 요청 모니터링
  const apiRequests: string[] = [];
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      apiRequests.push(request.url());
      console.log(`🌐 API Request: ${request.url()}`);
    }
  });

  // 에러 모니터링
  page.on('pageerror', error => {
    console.log(`❌ Page Error: ${error.message}`);
  });

  // HubManager 접속
  await page.goto('http://158.180.95.246:4400', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  // 스크린샷 저장
  await page.screenshot({
    path: '/tmp/api-url-test-01-homepage.png',
    fullPage: true
  });

  // 페이지 로드 확인
  const bodyText = await page.locator('body').textContent();
  console.log('📄 Page Content (first 300 chars):', bodyText?.substring(0, 300));

  // API 요청이 올바른 URL로 전송되었는지 확인
  console.log(`\n📊 API Requests (${apiRequests.length} total):`);
  apiRequests.forEach(url => console.log(`  - ${url}`));

  // localhost:4090으로 가는 요청이 없어야 함
  const localhostRequests = apiRequests.filter(url => url.includes('localhost:4090'));
  console.log(`\n🔍 Localhost:4090 Requests: ${localhostRequests.length}`);

  if (localhostRequests.length > 0) {
    console.log('❌ Found localhost:4090 requests (should be 158.180.95.246:4400):');
    localhostRequests.forEach(url => console.log(`  - ${url}`));
  }

  // 158.180.95.246:4400으로 가는 요청 확인
  const correctRequests = apiRequests.filter(url => url.includes('158.180.95.246:4400'));
  console.log(`\n✅ Correct API Requests: ${correctRequests.length}`);
  correctRequests.forEach(url => console.log(`  - ${url}`));

  // "Network Error" 텍스트가 없어야 함
  const hasNetworkError = bodyText?.includes('Network Error');
  console.log(`\n🔍 Has "Network Error"? ${hasNetworkError}`);

  // "로딩 중" 무한 스피너가 없어야 함
  await page.waitForTimeout(3000);
  const loadingSpinner = page.locator('text=로딩 중');
  const spinnerVisible = await loadingSpinner.isVisible().catch(() => false);
  console.log(`🔍 Loading Spinner Visible? ${spinnerVisible}`);

  // 결과 검증
  expect(localhostRequests.length).toBe(0);
  expect(correctRequests.length).toBeGreaterThan(0);
  expect(hasNetworkError).toBe(false);
  expect(spinnerVisible).toBe(false);

  console.log('\n✅ API URL 테스트 성공!');
});

test('허브 목록 API 응답 확인', async ({ page }) => {
  console.log('📌 /api/hubs 엔드포인트 테스트');

  // API 직접 호출
  const response = await page.request.get('http://158.180.95.246:4400/api/hubs');
  console.log(`🌐 Status: ${response.status()}`);

  const data = await response.json();
  console.log(`📊 Hubs Count: ${data.hubs?.length || 0}`);
  console.log(`📊 Response:`, JSON.stringify(data, null, 2));

  expect(response.status()).toBe(200);
  expect(data.hubs).toBeDefined();
  expect(data.hubs.length).toBeGreaterThan(0);

  console.log('✅ 허브 목록 API 테스트 성공!');
});
