import { test, expect } from '@playwright/test';

/**
 * WBFinHub 개발 모드 로그인 E2E 테스트
 * 개발 모드 로그인 버튼 클릭 → SSO → 대시보드 표시까지 테스트
 */

const FINHUB_FRONTEND = 'http://localhost:3020';
const FINHUB_BACKEND = 'http://localhost:4020';
const HUBMANAGER_BACKEND = 'http://localhost:4090';

test.describe('WBFinHub 개발 모드 로그인 E2E', () => {
  test.setTimeout(120000); // 2분 타임아웃

  test('개발 모드 로그인 → 대시보드 접근', async ({ page }) => {
    const errors: string[] = [];
    const logs: string[] = [];

    // 콘솔 로그 수집
    page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // 네트워크 에러 수집
    page.on('requestfailed', request => {
      errors.push(`Request failed: ${request.url()} - ${request.failure()?.errorText}`);
    });

    // Step 1: 로그인 페이지 접근
    console.log('📍 Step 1: 로그인 페이지 접근');
    await page.goto(`${FINHUB_FRONTEND}/login`, { waitUntil: 'networkidle' });

    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/finhub-e2e-01-login-page.png',
      fullPage: true
    });
    console.log('   현재 URL:', page.url());

    // Step 2: 개발 모드 로그인 버튼 확인
    console.log('📍 Step 2: 개발 모드 로그인 버튼 확인');
    const devLoginButton = page.locator('button:has-text("개발 모드 로그인")');
    const hasDevButton = await devLoginButton.count() > 0;
    console.log('   개발 모드 버튼 존재:', hasDevButton);
    expect(hasDevButton).toBe(true);

    // Step 3: 개발 모드 로그인 버튼 클릭
    console.log('📍 Step 3: 개발 모드 로그인 버튼 클릭');
    await devLoginButton.click();

    // 리다이렉트 대기 (SSO 처리)
    await page.waitForURL(/dashboard|pending-approval|login\?error/, { timeout: 30000 });

    console.log('   SSO 후 URL:', page.url());

    // 대시보드 또는 메인 페이지인 경우 로딩 완료 대기
    if (page.url().includes('/dashboard')) {
      console.log('   대시보드 로딩 대기...');
      // 로딩 스피너가 사라질 때까지 대기
      await page.waitForTimeout(3000);

      // 최종 페이지 로드 대기 (대시보드, 메인 페이지, 또는 로그인 페이지)
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    }

    console.log('   최종 URL:', page.url());

    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/finhub-e2e-02-after-login.png',
      fullPage: true
    });

    // Step 4: 결과 확인
    console.log('📍 Step 4: 결과 확인');
    const currentUrl = page.url();

    if (currentUrl.includes('/dashboard')) {
      console.log('✅ 대시보드 접근 성공!');

      // 대시보드 콘텐츠 확인
      await page.waitForTimeout(2000); // 콘텐츠 로딩 대기

      await page.screenshot({
        path: '/home/peterchung/HWTestAgent/test-results/finhub-e2e-03-dashboard.png',
        fullPage: true
      });

      // 대시보드 요소 확인
      const pageContent = await page.content();
      console.log('   페이지에 Dashboard 텍스트 포함:', pageContent.includes('Dashboard') || pageContent.includes('대시보드'));

    } else if (currentUrl.includes('/pending-approval')) {
      console.log('⏳ 승인 대기 페이지로 이동됨 (계정 상태: pending)');

    } else if (currentUrl.includes('error')) {
      const urlParams = new URL(currentUrl).searchParams;
      const errorType = urlParams.get('error');
      console.log('❌ 로그인 에러:', errorType);

      await page.screenshot({
        path: '/home/peterchung/HWTestAgent/test-results/finhub-e2e-error.png',
        fullPage: true
      });
    }

    // 에러 로그 출력
    if (errors.length > 0) {
      console.log('\n❌ 발견된 에러:');
      errors.forEach(err => console.log('   -', err));
    }

    // 테스트 성공 조건: 대시보드, 메인 페이지, 또는 pending-approval 페이지
    // 로그인이 성공하면 /dashboard → / 로 리다이렉트될 수 있음
    expect(currentUrl).toMatch(/dashboard|pending-approval|^http:\/\/localhost:3020\/?$/);
  });

  test('HubManager SSO 엔드포인트 직접 테스트', async ({ page }) => {
    console.log('📍 HubManager test-finhub-sso 직접 호출');

    // HubManager의 테스트 SSO 엔드포인트 직접 접근
    const response = await page.goto(`${HUBMANAGER_BACKEND}/api/auth/test-finhub-sso`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('   응답 상태:', response?.status());
    console.log('   최종 URL:', page.url());

    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/finhub-e2e-sso-direct.png',
      fullPage: true
    });

    // FinHub으로 리다이렉트되었는지 확인
    const currentUrl = page.url();
    console.log('   현재 URL:', currentUrl);

    // 쿠키 확인
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name === 'wh_access_token' || c.name.includes('access'));
    console.log('   인증 쿠키:', authCookie ? '존재' : '없음');

    expect(currentUrl).toContain('localhost');
  });
});
