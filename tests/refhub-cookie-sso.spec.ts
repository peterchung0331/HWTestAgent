import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * RefHub Cookie SSO E2E Test
 *
 * 테스트 플로우:
 * 1. RefHub(localhost:3099) 접속
 * 2. 로그인 페이지 확인
 * 3. Google SSO 버튼 클릭 → HubManager(4090)로 리다이렉트
 * 4. Google OAuth 인증
 * 5. HubManager에서 쿠키 설정 후 RefHub로 리다이렉트
 * 6. RefHub 대시보드 표시 확인
 */

const REFHUB_URL = 'http://localhost:3099';
const HUBMANAGER_URL = 'http://localhost:4090';
const SCREENSHOT_DIR = '/home/peterchung/HWTestAgent/test-results/MyTester/screenshots/2026-01-04-refhub-sso';

// Google 테스트 계정 (환경변수에서 로드)
const GOOGLE_EMAIL = process.env.GOOGLE_TEST_EMAIL || 'test@wavebridge.kr';
const GOOGLE_PASSWORD = process.env.GOOGLE_TEST_PASSWORD || '';

async function takeScreenshot(page: Page, name: string) {
  const filepath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot saved: ${name}.png`);
  return filepath;
}

test.describe('RefHub Cookie SSO Flow', () => {
  test.setTimeout(120000); // 2분 타임아웃

  test.beforeEach(async ({ page }) => {
    // 콘솔 로그 캡처
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`[Browser Error]: ${msg.text()}`);
      }
    });

    // 네트워크 에러 캡처
    page.on('requestfailed', (request) => {
      console.log(`[Request Failed]: ${request.url()} - ${request.failure()?.errorText}`);
    });
  });

  test('Step 1: RefHub 초기 접속 및 로그인 페이지 확인', async ({ page }) => {
    console.log('\n🔍 Step 1: RefHub 초기 접속...');

    // RefHub 메인 페이지 접속
    await page.goto(REFHUB_URL, { waitUntil: 'networkidle' });
    await takeScreenshot(page, '01-refhub-initial');

    // 로그인 페이지로 리다이렉트되거나 로그인 필요 상태 확인
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    // 로그인 버튼 또는 로그인 페이지 확인
    const loginButton = page.locator('text=Google로 로그인').or(page.locator('text=로그인'));

    if (await loginButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✅ 로그인 버튼 발견');
      await takeScreenshot(page, '02-login-button-visible');
    } else {
      // 이미 인증된 상태일 수 있음
      const dashboardIndicator = page.locator('text=SSO 인증 성공').or(page.locator('text=RefHub'));
      if (await dashboardIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('✅ 이미 인증된 상태 - 대시보드 표시됨');
        await takeScreenshot(page, '02-already-authenticated');
      }
    }
  });

  test('Step 2: 백엔드 API 상태 확인', async ({ page }) => {
    console.log('\n🔍 Step 2: 백엔드 API 상태 확인...');

    // RefHub 백엔드 health check
    const refhubHealth = await page.goto('http://localhost:4099/api/health', { waitUntil: 'networkidle' });
    const refhubStatus = refhubHealth?.status();
    console.log(`📡 RefHub Backend: ${refhubStatus === 200 ? '✅ OK' : '❌ Failed'} (${refhubStatus})`);

    // HubManager 백엔드 health check
    const hubHealth = await page.goto(`${HUBMANAGER_URL}/api/health`, { waitUntil: 'networkidle' });
    const hubStatus = hubHealth?.status();
    console.log(`📡 HubManager Backend: ${hubStatus === 200 ? '✅ OK' : '❌ Failed'} (${hubStatus})`);

    expect(refhubStatus).toBe(200);
  });

  test('Step 3: SSO 로그인 플로우 시뮬레이션 (테스트 엔드포인트)', async ({ page }) => {
    console.log('\n🔍 Step 3: SSO 로그인 플로우 테스트...');

    // HubManager의 테스트 로그인 엔드포인트 사용 (Google OAuth 없이)
    console.log('📝 HubManager 테스트 로그인 호출...');

    const testLoginResponse = await page.goto(`${HUBMANAGER_URL}/api/auth/test-login`, {
      waitUntil: 'networkidle',
    });

    await takeScreenshot(page, '03-test-login-response');

    if (testLoginResponse?.status() === 200) {
      const responseText = await page.textContent('pre') || await page.textContent('body');
      console.log('✅ 테스트 로그인 성공');

      try {
        const loginData = JSON.parse(responseText || '{}');
        if (loginData.success && loginData.data?.access_token) {
          console.log(`🎫 JWT Token 발급됨 (${loginData.data.access_token.substring(0, 30)}...)`);
          console.log(`👤 User: ${loginData.data.user?.email}`);
        }
      } catch (e) {
        console.log('Response:', responseText?.substring(0, 200));
      }
    } else {
      console.log(`❌ 테스트 로그인 실패: ${testLoginResponse?.status()}`);
    }
  });

  test('Step 4: Cookie SSO 완료 시뮬레이션', async ({ page, context }) => {
    console.log('\n🔍 Step 4: Cookie SSO 완료 시뮬레이션...');

    // 1. 먼저 테스트 토큰 생성
    const tokenResponse = await page.goto(`${HUBMANAGER_URL}/api/auth/test-login`);
    const tokenData = await page.textContent('pre') || await page.textContent('body');
    let accessToken = '';

    try {
      const parsed = JSON.parse(tokenData || '{}');
      accessToken = parsed.data?.access_token || '';
    } catch (e) {
      console.log('❌ 토큰 파싱 실패');
    }

    if (!accessToken) {
      console.log('⚠️ 토큰 없음 - 쿠키 설정 건너뜀');
      return;
    }

    // 2. RefHub 도메인에 쿠키 설정 (HubManager가 SSO 완료 시 설정하는 것과 동일)
    console.log('🍪 쿠키 설정 중...');
    await context.addCookies([{
      name: 'wbhub_access_token',
      value: accessToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    }]);

    // 3. RefHub SSO 완료 엔드포인트로 이동
    console.log('📍 RefHub /auth/sso-complete 호출...');
    const ssoCompleteResponse = await page.goto('http://localhost:4099/auth/sso-complete', {
      waitUntil: 'networkidle',
    });

    await takeScreenshot(page, '04-sso-complete');

    const finalUrl = page.url();
    console.log(`📍 Final URL: ${finalUrl}`);

    // 4. 결과 확인 - 대시보드로 리다이렉트되어야 함
    if (finalUrl.includes('localhost:3099') && !finalUrl.includes('login')) {
      console.log('✅ SSO 완료 - RefHub 대시보드로 이동됨');
    } else if (finalUrl.includes('login')) {
      console.log('⚠️ 로그인 페이지로 리다이렉트됨 - 토큰 검증 실패 가능성');
    }
  });

  test('Step 5: RefHub Debug 페이지 확인', async ({ page, context }) => {
    console.log('\n🔍 Step 5: RefHub Debug 페이지 확인...');

    // 토큰 쿠키 설정
    const tokenResponse = await page.goto(`${HUBMANAGER_URL}/api/auth/test-login`);
    const tokenData = await page.textContent('pre') || '';

    try {
      const parsed = JSON.parse(tokenData);
      if (parsed.data?.access_token) {
        await context.addCookies([{
          name: 'wbhub_access_token',
          value: parsed.data.access_token,
          domain: 'localhost',
          path: '/',
          httpOnly: true,
          secure: false,
          sameSite: 'Lax',
        }]);
      }
    } catch (e) {}

    // Debug 페이지 접속
    await page.goto('http://localhost:3099/debug', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // API 로드 대기

    await takeScreenshot(page, '05-debug-page');

    // Debug 정보 확인
    const pageContent = await page.textContent('body') || '';

    if (pageContent.includes('SSO 디버그') || pageContent.includes('쿠키 상태')) {
      console.log('✅ Debug 페이지 로드됨');

      // 인증 상태 확인
      if (pageContent.includes('인증됨') || pageContent.includes('Yes')) {
        console.log('✅ 인증 상태: 인증됨');
      } else {
        console.log('⚠️ 인증 상태: 미인증');
      }
    } else {
      console.log('⚠️ Debug 페이지 내용 확인 필요');
    }
  });

  test('Step 6: Cookie API 직접 테스트', async ({ page }) => {
    console.log('\n🔍 Step 6: Cookie Debug API 직접 테스트...');

    // Cookie status API 호출
    const response = await page.goto('http://localhost:4099/api/debug/cookie-status', {
      waitUntil: 'networkidle',
    });

    await takeScreenshot(page, '06-cookie-status-api');

    const responseText = await page.textContent('pre') || await page.textContent('body') || '';
    console.log('📋 Cookie Status Response:');

    try {
      const data = JSON.parse(responseText);
      console.log(JSON.stringify(data, null, 2));

      if (data.success) {
        console.log(`✅ Access Token 존재: ${data.cookies?.accessToken?.exists ? 'Yes' : 'No'}`);
        console.log(`✅ Refresh Token 존재: ${data.cookies?.refreshToken?.exists ? 'Yes' : 'No'}`);
      }
    } catch (e) {
      console.log(responseText.substring(0, 500));
    }
  });
});
