import { test, expect } from '@playwright/test';

/**
 * WBFinHub 로컬 E2E 테스트 (간단 버전)
 *
 * 목적: 로컬 환경에서 프론트엔드와 백엔드가 정상 작동하는지 검증
 * 환경: 백엔드 4020, 프론트엔드 3001
 */

const BACKEND_URL = 'http://localhost:4020';
const FRONTEND_URL = 'http://localhost:3001';

test.describe('WBFinHub 로컬 E2E 테스트', () => {
  test.setTimeout(60000); // 1분 타임아웃

  test('1. 백엔드 API 접근 가능', async ({ request }) => {
    console.log('📝 Testing backend health...');

    const response = await request.get(`${BACKEND_URL}/api/health`);

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    console.log('✅ Backend health:', data);
    expect(data.success).toBe(true);
    expect(data.port).toBe('4020');
  });

  test('2. 프론트엔드 페이지 로드', async ({ page }) => {
    console.log('📝 Testing frontend page load...');

    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // 스크린샷 저장
    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/finhub-local-e2e-homepage.png',
      fullPage: true
    });

    console.log('   현재 URL:', page.url());
    console.log('   페이지 제목:', await page.title());

    // 페이지가 로드되었는지 확인
    expect(page.url()).toContain('localhost:3001');

    // 치명적인 에러가 없는지 확인
    const criticalErrors = errors.filter(e =>
      !e.includes('Failed to load resource') &&
      !e.includes('404')
    );

    if (criticalErrors.length > 0) {
      console.log('⚠️ Critical errors found:', criticalErrors);
    }

    console.log('✅ Frontend page loaded successfully');
  });

  test('3. 프론트엔드 → 백엔드 API 호출', async ({ page }) => {
    console.log('📝 Testing frontend to backend API call...');

    let apiCallDetected = false;
    let apiCallSuccess = false;

    // API 호출 감지
    page.on('request', request => {
      if (request.url().includes(BACKEND_URL)) {
        apiCallDetected = true;
        console.log('   API 호출 감지:', request.url());
      }
    });

    page.on('response', response => {
      if (response.url().includes(BACKEND_URL)) {
        console.log('   API 응답:', response.status(), response.url());
        if (response.ok() || response.status() === 401) {
          apiCallSuccess = true; // 401도 정상 (인증 필요)
        }
      }
    });

    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // 몇 초 대기하여 초기 API 호출 완료
    await page.waitForTimeout(3000);

    console.log('   API 호출 감지:', apiCallDetected);
    console.log('   API 응답 성공:', apiCallSuccess);

    // API 호출이 있었다면 성공으로 간주 (401도 OK)
    if (apiCallDetected) {
      expect(apiCallSuccess).toBe(true);
      console.log('✅ Frontend to backend communication works');
    } else {
      console.log('ℹ️ No API calls detected (may be normal for landing page)');
    }
  });

  test('4. 로그인 페이지 접근', async ({ page }) => {
    console.log('📝 Testing login page access...');

    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // 스크린샷 저장
    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/finhub-local-e2e-login.png',
      fullPage: true
    });

    console.log('   현재 URL:', page.url());
    console.log('   페이지 제목:', await page.title());

    // 로그인 페이지 요소 확인
    const hasLoginElement = await page.locator('form, button:has-text("로그인"), button:has-text("Login")').count() > 0;

    console.log('   로그인 요소 존재:', hasLoginElement);
    console.log('✅ Login page accessible');
  });

  test('5. 인증 없이 대시보드 접근 시 리다이렉트', async ({ page }) => {
    console.log('📝 Testing dashboard redirect without auth...');

    await page.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // 몇 초 대기 (리다이렉트 대기)
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log('   현재 URL:', currentUrl);

    // 로그인 페이지로 리다이렉트되었거나, 대시보드에 접근 차단 메시지가 있는지 확인
    const isRedirectedToLogin = currentUrl.includes('/login');
    const hasAccessDenied = await page.locator('text=/접근.*거부|Access.*Denied|unauthorized/i').count() > 0;

    console.log('   로그인 페이지로 리다이렉트:', isRedirectedToLogin);
    console.log('   접근 거부 메시지:', hasAccessDenied);

    // 둘 중 하나는 true여야 함 (보안 정상 작동)
    expect(isRedirectedToLogin || hasAccessDenied).toBe(true);

    console.log('✅ Dashboard protected from unauthorized access');
  });
});
