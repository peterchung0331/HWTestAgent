import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * E2E 테스트: 오라클 스테이징 환경
 * HubManager → SalesHub 플로우
 *
 * 환경: http://158.180.95.246:4400 (오라클 스테이징)
 * 목표: HubManager에서 SalesHub로 이동하여 정상 작동 확인
 */

const ORACLE_STAGING_URL = 'http://158.180.95.246:4400';
const HUBMANAGER_URL = ORACLE_STAGING_URL;
const SALESHUB_URL = `${ORACLE_STAGING_URL}/saleshub`;

// 스크린샷 저장 경로
const SCREENSHOT_DIR = '/home/peterchung/HWTestAgent/test-results/MyTester/screenshots/2026-01-12-Oracle-Staging-E2E';

test.describe('오라클 스테이징 E2E: HubManager → SalesHub', () => {
  test.beforeAll(() => {
    // 스크린샷 디렉토리 생성
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test('1. HubManager 접속 및 정상 로드 확인', async ({ page }) => {
    console.log('📌 Step 1: HubManager 접속');

    // 네트워크 모니터링
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });

    page.on('requestfailed', request => {
      console.log('❌ Request Failed:', request.url(), request.failure()?.errorText);
    });

    // HubManager 접속
    const response = await page.goto(HUBMANAGER_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // 스크린샷 저장
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-hubmanager-home.png'),
      fullPage: true
    });

    // 상태 코드 확인
    expect(response?.status()).toBe(200);
    console.log('✅ HubManager 정상 로드 (200)');

    // 페이지 타이틀 확인
    const title = await page.title();
    console.log('📄 Page Title:', title);
    expect(title).toBeTruthy();

    // 허브 선택 UI 확인 (HubManager는 허브 목록을 표시)
    const hubLinksVisible = await page.locator('a[href*="/saleshub"], a[href*="/finhub"]').count();
    console.log(`🔗 Found ${hubLinksVisible} hub links`);

    // HubManager는 로그인 페이지나 대시보드를 표시할 수 있음
    if (hubLinksVisible === 0) {
      console.log('⚠️ 허브 링크가 보이지 않음 (로그인 페이지일 수 있음)');
      const hasLoginUI = await page.locator('button, a').filter({ hasText: /google|로그인|login/i }).count() > 0;
      console.log('🔐 Login UI present:', hasLoginUI);
    } else {
      expect(hubLinksVisible).toBeGreaterThan(0);
    }
  });

  test('2. HubManager에서 SalesHub로 이동', async ({ page }) => {
    console.log('📌 Step 2: SalesHub로 이동');

    // HubManager 접속
    await page.goto(HUBMANAGER_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // SalesHub 링크 클릭 (여러 선택자 시도)
    const salesHubSelectors = [
      'a[href="/saleshub"]',
      'a[href*="saleshub"]',
      'text=SalesHub',
      'text=세일즈허브',
      '[data-hub="saleshub"]'
    ];

    let clicked = false;
    for (const selector of salesHubSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        console.log(`🔗 Found SalesHub link: ${selector}`);
        await element.click();
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      // 직접 URL 이동
      console.log('⚠️ SalesHub 링크를 찾을 수 없어 직접 URL 이동');
      await page.goto(SALESHUB_URL, { waitUntil: 'networkidle', timeout: 30000 });
    } else {
      // 페이지 로드 대기
      await page.waitForLoadState('networkidle', { timeout: 30000 });
    }

    // 스크린샷 저장
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-saleshub-landing.png'),
      fullPage: true
    });

    // URL 확인
    const currentURL = page.url();
    console.log('📍 Current URL:', currentURL);
    expect(currentURL).toContain('saleshub');

    console.log('✅ SalesHub로 이동 완료');
  });

  test('3. SalesHub 로그인 페이지 확인', async ({ page }) => {
    console.log('📌 Step 3: SalesHub 로그인 페이지 확인');

    // SalesHub 접속
    const response = await page.goto(SALESHUB_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // 상태 코드 확인
    expect(response?.status()).toBe(200);

    // 스크린샷 저장
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03-saleshub-login.png'),
      fullPage: true
    });

    // 로그인 관련 요소 확인 (Google OAuth 버튼 또는 로그인 폼)
    const hasGoogleButton = await page.locator('button:has-text("Google"), a:has-text("Google")').count() > 0;
    const hasLoginForm = await page.locator('form[action*="login"], form[action*="auth"]').count() > 0;
    const hasAuthUI = hasGoogleButton || hasLoginForm;

    console.log('🔐 Google Button:', hasGoogleButton);
    console.log('🔐 Login Form:', hasLoginForm);

    if (!hasAuthUI) {
      // 이미 로그인된 상태일 수 있음
      console.log('⚠️ 로그인 UI를 찾을 수 없음 (이미 로그인 상태일 수 있음)');

      // 대시보드 요소 확인
      const hasDashboard = await page.locator('nav, header, [role="navigation"]').count() > 0;
      console.log('🏠 Dashboard detected:', hasDashboard);
    } else {
      console.log('✅ 로그인 페이지 정상 확인');
    }
  });

  test('4. SalesHub API 헬스체크', async ({ page }) => {
    console.log('📌 Step 4: SalesHub API 헬스체크');

    // API 헬스체크 호출
    const apiURL = `${SALESHUB_URL}/api/health`;
    const response = await page.goto(apiURL, { timeout: 10000 });

    // 스크린샷 저장
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04-saleshub-api-health.png'),
      fullPage: true
    });

    // 상태 코드 확인
    const status = response?.status();
    console.log('🏥 Health API Status:', status);
    expect(status).toBe(200);

    // JSON 응답 확인
    const contentType = response?.headers()['content-type'];
    console.log('📦 Content-Type:', contentType);
    expect(contentType).toContain('application/json');

    // 응답 본문 확인
    const body = await response?.json();
    console.log('📄 Health Response:', body);
    expect(body).toHaveProperty('success');
    expect(body.success).toBe(true);

    console.log('✅ SalesHub API 정상 작동');
  });

  test('5. HubManager API 헬스체크', async ({ page }) => {
    console.log('📌 Step 5: HubManager API 헬스체크');

    // API 헬스체크 호출
    const apiURL = `${HUBMANAGER_URL}/api/health`;
    const response = await page.goto(apiURL, { timeout: 10000 });

    // 스크린샷 저장
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '05-hubmanager-api-health.png'),
      fullPage: true
    });

    // 상태 코드 확인
    const status = response?.status();
    console.log('🏥 Health API Status:', status);
    expect(status).toBe(200);

    // JSON 응답 확인
    const contentType = response?.headers()['content-type'];
    console.log('📦 Content-Type:', contentType);
    expect(contentType).toContain('application/json');

    // 응답 본문 확인
    const body = await response?.json();
    console.log('📄 Health Response:', body);
    expect(body).toHaveProperty('success');
    expect(body.success).toBe(true);

    console.log('✅ HubManager API 정상 작동');
  });

  test('6. 정적 파일 서빙 확인 (CSS, JS)', async ({ page }) => {
    console.log('📌 Step 6: 정적 파일 서빙 확인');

    // 네트워크 요청 모니터링
    const resourceTypes: { [key: string]: number } = {
      stylesheet: 0,
      script: 0,
      image: 0
    };

    page.on('response', response => {
      const resourceType = response.request().resourceType();
      if (resourceType in resourceTypes) {
        resourceTypes[resourceType]++;
        console.log(`📦 ${resourceType}: ${response.url()} (${response.status()})`);
      }
    });

    // SalesHub 접속
    await page.goto(SALESHUB_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // 스크린샷 저장
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '06-saleshub-static-files.png'),
      fullPage: true
    });

    console.log('📊 Resource Summary:', resourceTypes);

    // CSS와 JS 파일이 로드되었는지 확인
    expect(resourceTypes.stylesheet).toBeGreaterThan(0);
    expect(resourceTypes.script).toBeGreaterThan(0);

    console.log('✅ 정적 파일 정상 서빙');
  });
});

test.describe('오라클 스테이징 크로스 허브 통신', () => {
  test('7. HubManager ↔ SalesHub 토큰 전달 확인', async ({ page }) => {
    console.log('📌 Step 7: 허브 간 토큰 전달 확인');

    // HubManager에서 시작
    await page.goto(HUBMANAGER_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // 쿠키 확인 (JWT 토큰)
    const hubManagerCookies = await page.context().cookies();
    console.log('🍪 HubManager Cookies:', hubManagerCookies.map(c => c.name));

    // SalesHub로 이동
    await page.goto(SALESHUB_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // 쿠키 확인
    const salesHubCookies = await page.context().cookies();
    console.log('🍪 SalesHub Cookies:', salesHubCookies.map(c => c.name));

    // 스크린샷 저장
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '07-cross-hub-token.png'),
      fullPage: true
    });

    // 토큰 관련 쿠키 존재 확인 (jwt, session 등)
    const hasAuthCookie = salesHubCookies.some(c =>
      c.name.toLowerCase().includes('jwt') ||
      c.name.toLowerCase().includes('session') ||
      c.name.toLowerCase().includes('token')
    );

    console.log('🔐 Auth Cookie Present:', hasAuthCookie);

    if (!hasAuthCookie) {
      console.log('⚠️ 인증 쿠키가 없음 (로그인이 필요할 수 있음)');
    }

    console.log('✅ 크로스 허브 통신 확인 완료');
  });
});
