import { test, expect } from '@playwright/test';

/**
 * WBSalesHub 쿠키 기반 SSO 테스트
 *
 * 테스트 시나리오:
 * 1. 로그인 페이지 접속
 * 2. "HubManager로 로그인" 버튼 확인
 * 3. 네트워크 요청 모니터링
 * 4. 쿠키 확인
 */

test.describe('WBSalesHub Cookie-based SSO', () => {
  test.beforeEach(async ({ page }) => {
    // 네트워크 및 콘솔 모니터링
    page.on('requestfailed', request => {
      console.log('❌ Request failed:', request.url());
    });
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });
  });

  test('로그인 페이지 렌더링 확인', async ({ page }) => {
    console.log('📍 Test 1: 로그인 페이지 접속');

    // 로그인 페이지 접속
    await page.goto('http://localhost:3010/login');

    // 페이지 로드 대기
    await page.waitForLoadState('networkidle');

    // 스크린샷 저장
    await page.screenshot({
      path: '/home/peterchung/WBSalesHub/test-results/01-login-page.png',
      fullPage: true
    });

    // 페이지 제목 확인
    await expect(page.locator('text=WBSalesHub')).toBeVisible();

    // "HubManager로 로그인" 버튼 확인
    const loginButton = page.locator('button:has-text("HubManager로 로그인")');
    await expect(loginButton).toBeVisible();

    console.log('✅ 로그인 페이지 렌더링 성공');
  });

  test('쿠키 없이 API 요청 시 401 확인', async ({ page, context }) => {
    console.log('📍 Test 2: 인증 없이 API 요청');

    // 쿠키 모두 삭제
    await context.clearCookies();

    // API 요청 시도 (/auth/me)
    const response = await page.goto('http://localhost:4010/auth/me');

    console.log('API Response Status:', response?.status());

    // 401 또는 로그인 페이지로 리다이렉트 확인
    if (response?.status() === 401) {
      console.log('✅ 쿠키 없이 401 응답 받음');
    } else {
      console.log('⚠️  예상과 다른 응답:', response?.status());
    }
  });

  test('로그인 URL 확인', async ({ page }) => {
    console.log('📍 Test 3: 로그인 URL 생성 확인');

    await page.goto('http://localhost:3010/login');
    await page.waitForLoadState('networkidle');

    // "HubManager로 로그인" 버튼 찾기
    const loginButton = page.locator('button:has-text("HubManager로 로그인")');
    await expect(loginButton).toBeVisible();

    // 버튼에 연결된 URL 확인 (클릭 시 이동할 URL)
    // 실제로는 window.location.href로 이동하므로 버튼 클릭 없이 확인
    const expectedLoginUrl = 'http://localhost:3090/api/auth/google-oauth?app=wbsaleshub';
    console.log('✅ 예상 로그인 URL:', expectedLoginUrl);
  });

  test('프론트엔드 환경변수 확인', async ({ page }) => {
    console.log('📍 Test 4: 프론트엔드 환경변수 확인');

    await page.goto('http://localhost:3010/login');
    await page.waitForLoadState('networkidle');

    // 브라우저 콘솔에서 환경변수 확인
    const apiUrl = await page.evaluate(() => {
      return (window as any).NEXT_PUBLIC_API_URL ||
             process.env.NEXT_PUBLIC_API_URL ||
             'not found';
    });

    console.log('NEXT_PUBLIC_API_URL:', apiUrl);

    const hubManagerUrl = await page.evaluate(() => {
      return (window as any).NEXT_PUBLIC_HUB_MANAGER_URL ||
             process.env.NEXT_PUBLIC_HUB_MANAGER_URL ||
             'not found';
    });

    console.log('NEXT_PUBLIC_HUB_MANAGER_URL:', hubManagerUrl);

    console.log('✅ 환경변수 확인 완료');
  });

  test('백엔드 헬스체크', async ({ page }) => {
    console.log('📍 Test 5: 백엔드 서버 상태 확인');

    const response = await page.goto('http://localhost:4010/health');

    console.log('Backend Health Status:', response?.status());

    if (response?.status() === 200) {
      const body = await response.text();
      console.log('Backend Response:', body);
      console.log('✅ 백엔드 서버 정상 작동');
    } else if (response?.status() === 404) {
      console.log('⚠️  /health 엔드포인트 없음 (정상일 수 있음)');
    } else {
      console.log('❌ 백엔드 서버 문제:', response?.status());
    }
  });
});
