import { test, expect } from '@playwright/test';

test.describe('WBFinHub 로컬 서버 디버깅', () => {
  test('3020 포트 프론트엔드 접근 테스트', async ({ page }) => {
    const errors: string[] = [];
    const requests: { url: string; status: number }[] = [];

    // 콘솔 에러 수집
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // 네트워크 요청 모니터링
    page.on('response', response => {
      requests.push({ url: response.url(), status: response.status() });
    });

    page.on('requestfailed', request => {
      errors.push(`Request failed: ${request.url()} - ${request.failure()?.errorText}`);
    });

    console.log('🔍 http://localhost:3020 접근 시도...');

    const response = await page.goto('http://localhost:3020', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    console.log(`📊 응답 상태: ${response?.status()}`);
    console.log(`📊 응답 URL: ${response?.url()}`);

    // 스크린샷 저장
    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/finhub-3020-debug.png',
      fullPage: true
    });
    console.log('📸 스크린샷 저장: test-results/finhub-3020-debug.png');

    // 페이지 타이틀 확인
    const title = await page.title();
    console.log(`📄 페이지 타이틀: ${title}`);

    // 페이지 내용 확인
    const bodyText = await page.locator('body').textContent();
    console.log(`📝 페이지 내용 (처음 500자): ${bodyText?.substring(0, 500)}`);

    // 에러 출력
    if (errors.length > 0) {
      console.log('❌ 발견된 에러:');
      errors.forEach(err => console.log(`  - ${err}`));
    }

    // 실패한 요청 출력
    const failedRequests = requests.filter(r => r.status >= 400);
    if (failedRequests.length > 0) {
      console.log('❌ 실패한 요청:');
      failedRequests.forEach(r => console.log(`  - ${r.url}: ${r.status}`));
    }

    expect(response?.status()).toBe(200);
  });

  test('로그인 페이지 접근 테스트', async ({ page }) => {
    console.log('🔍 http://localhost:3020/login 접근 시도...');

    const response = await page.goto('http://localhost:3020/login', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    console.log(`📊 응답 상태: ${response?.status()}`);

    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/finhub-login-debug.png',
      fullPage: true
    });
    console.log('📸 스크린샷 저장: test-results/finhub-login-debug.png');

    // 로그인 버튼 확인
    const loginButton = page.locator('button:has-text("Google"), button:has-text("로그인"), a:has-text("Google")');
    const hasLoginButton = await loginButton.count() > 0;
    console.log(`🔐 로그인 버튼 존재: ${hasLoginButton}`);

    expect(response?.status()).toBe(200);
  });

  test('대시보드 접근 테스트 (인증 필요)', async ({ page }) => {
    console.log('🔍 http://localhost:3020/dashboard 접근 시도...');

    const response = await page.goto('http://localhost:3020/dashboard', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    console.log(`📊 응답 상태: ${response?.status()}`);
    console.log(`📊 최종 URL: ${page.url()}`);

    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/finhub-dashboard-debug.png',
      fullPage: true
    });
    console.log('📸 스크린샷 저장: test-results/finhub-dashboard-debug.png');

    // 리다이렉트 여부 확인
    if (page.url().includes('login')) {
      console.log('✅ 로그인 페이지로 리다이렉트됨 (정상 동작)');
    }
  });
});
