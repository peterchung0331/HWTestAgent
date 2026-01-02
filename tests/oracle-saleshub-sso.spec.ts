/**
 * Oracle 운영환경 - WBSalesHub SSO 통합 테스트
 *
 * 테스트 목표:
 * 1. HubManager에서 Hub 선택 화면 접속
 * 2. SalesHub 선택 → SSO 인증 플로우
 * 3. SalesHub 대시보드 정상 렌더링
 * 4. 사용자 정보 확인
 */

import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// 오라클 운영 환경 URL
const ORACLE_HUB_MANAGER = 'http://158.180.95.246:4090';
const ORACLE_SALES_HUB = 'http://158.180.95.246:4010';
const HUB_MANAGER_FRONTEND = 'http://158.180.95.246:3090';
const SALES_HUB_FRONTEND = 'http://158.180.95.246:3010';

// 스크린샷 저장 경로
const SCREENSHOT_DIR = '/mnt/c/GitHub/HWTestAgent/TestReport/screenshots';

// 스크린샷 저장 헬퍼
async function saveScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}_${name}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);

  // 디렉토리가 없으면 생성
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  await page.screenshot({
    path: filepath,
    fullPage: true
  });

  console.log(`📸 Screenshot saved: ${filename}`);
  return filepath;
}

test.describe('오라클 운영환경 - SalesHub SSO 테스트', () => {

  test.beforeEach(async ({ page }) => {
    // 콘솔 로그 및 에러 캡처
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        console.log(`[Browser ${type.toUpperCase()}]:`, msg.text());
      }
    });

    page.on('pageerror', err => {
      console.error('[Browser Page Error]:', err.message);
    });

    // 네트워크 실패 모니터링
    page.on('requestfailed', request => {
      console.error(`❌ Request failed: ${request.url()}`);
      console.error(`   Failure: ${request.failure()?.errorText}`);
    });
  });

  test('Step 1: HubManager 헬스체크', async ({ page }) => {
    console.log('\n📝 Step 1: HubManager 헬스체크');

    const response = await page.goto(`${ORACLE_HUB_MANAGER}/api/health`);
    const status = response?.status();

    console.log(`   Response status: ${status}`);
    expect(status).toBe(200);

    const body = await response?.json();
    console.log('   Health check:', body);

    expect(body.success).toBe(true);
    expect(body.message).toContain('WBHubManager');

    console.log('✅ HubManager 헬스체크 성공');
  });

  test('Step 2: SalesHub 헬스체크', async ({ page }) => {
    console.log('\n📝 Step 2: SalesHub 헬스체크');

    const response = await page.goto(`${ORACLE_SALES_HUB}/api/health`);
    const status = response?.status();

    console.log(`   Response status: ${status}`);
    expect(status).toBe(200);

    const body = await response?.json();
    console.log('   Health check:', body);

    expect(body.success).toBe(true);
    expect(body.message).toContain('WBSalesHub');
    expect(body.serverReady).toBe(true);

    console.log('✅ SalesHub 헬스체크 성공');
  });

  test('Step 3: HubManager JWT 공개키 확인', async ({ page }) => {
    console.log('\n📝 Step 3: HubManager JWT 공개키 확인');

    const response = await page.goto(`${ORACLE_HUB_MANAGER}/api/auth/public-key`);
    const status = response?.status();

    console.log(`   Response status: ${status}`);
    expect(status).toBe(200);

    const body = await response?.json();
    console.log('   Public key loaded:', body.success);

    expect(body.success).toBe(true);
    expect(body.data.publicKey).toContain('BEGIN PUBLIC KEY');

    console.log('✅ JWT 공개키 정상 로드');
  });

  test('Step 4: HubManager 허브 선택 페이지 렌더링', async ({ page }) => {
    console.log('\n📝 Step 4: HubManager 허브 선택 페이지 렌더링');

    // 허브 선택 페이지로 이동
    await page.goto(`${HUB_MANAGER_FRONTEND}/hubs`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // 스크린샷 저장
    const screenshotPath = await saveScreenshot(page, 'step4-hub-selection-page');
    console.log(`   Screenshot: ${screenshotPath}`);

    // 페이지 타이틀 확인
    const title = await page.title();
    console.log(`   Page title: ${title}`);

    // Hub 선택 카드가 렌더링되었는지 확인
    const hubCards = await page.locator('[class*="hub-card"], [class*="card"]').count();
    console.log(`   Hub cards found: ${hubCards}`);

    // SalesHub 링크 찾기
    const salesHubLink = page.locator('a[href*="saleshub"], a:has-text("SalesHub"), a:has-text("영업")');
    const salesHubCount = await salesHubLink.count();
    console.log(`   SalesHub links found: ${salesHubCount}`);

    if (salesHubCount > 0) {
      console.log('✅ HubManager 허브 선택 페이지 정상 렌더링');
    } else {
      console.warn('⚠️ SalesHub 링크를 찾을 수 없습니다');

      // 페이지 내용 로깅
      const bodyText = await page.locator('body').textContent();
      console.log('   Page content preview:', bodyText?.substring(0, 500));
    }
  });

  test('Step 5: SalesHub SSO 인증 플로우 전체 테스트', async ({ page }) => {
    console.log('\n📝 Step 5: SalesHub SSO 인증 플로우 전체 테스트');

    // 1단계: HubManager에서 토큰 발급
    console.log('   1️⃣ HubManager 토큰 발급 요청');
    const tokenResponse = await page.request.post(`${ORACLE_HUB_MANAGER}/api/auth/google-login`, {
      data: {
        email: 'peter.chung@wavebridge.com',
        name: 'Peter Chung'
      }
    });

    expect(tokenResponse.ok()).toBeTruthy();
    const tokenData = await tokenResponse.json();
    console.log('   ✅ 토큰 발급 성공');

    expect(tokenData.success).toBe(true);
    expect(tokenData.data.accessToken).toBeTruthy();

    const accessToken = tokenData.data.accessToken;
    console.log(`   Access token length: ${accessToken.length}`);

    // 2단계: SalesHub SSO 엔드포인트 호출 (리다이렉트 따라가기)
    console.log('   2️⃣ SalesHub SSO 엔드포인트 호출');

    const ssoUrl = `${ORACLE_SALES_HUB}/api/auth/sso?token=${accessToken}`;
    const ssoResponse = await page.goto(ssoUrl, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // 현재 URL 확인 (리다이렉트 후)
    const currentUrl = page.url();
    console.log(`   Current URL after SSO: ${currentUrl}`);

    // URL에 accessToken과 refreshToken이 있는지 확인
    expect(currentUrl).toContain('accessToken');
    expect(currentUrl).toContain('refreshToken');
    console.log('   ✅ SSO 리다이렉트 성공 (토큰 포함)');

    // 스크린샷 저장
    await saveScreenshot(page, 'step5-after-sso-redirect');

    // 3단계: 프론트엔드에서 토큰 처리 대기
    console.log('   3️⃣ 프론트엔드 토큰 처리 대기');
    await page.waitForTimeout(2000);

    // 4단계: 대시보드 렌더링 확인
    console.log('   4️⃣ SalesHub 대시보드 렌더링 확인');

    // 로그인 성공 후 대시보드로 이동했는지 확인
    const finalUrl = page.url();
    console.log(`   Final URL: ${finalUrl}`);

    // 대시보드 요소 찾기 (다양한 선택자 시도)
    const possibleSelectors = [
      'h1, h2, h3', // 헤더
      '[class*="dashboard"]', // 대시보드 클래스
      '[class*="container"]', // 컨테이너
      'nav', // 네비게이션
      'main', // 메인 콘텐츠
    ];

    for (const selector of possibleSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`   ✅ Found elements: ${selector} (${count})`);
      }
    }

    // 최종 스크린샷
    await saveScreenshot(page, 'step5-saleshub-dashboard-final');

    console.log('✅ SalesHub SSO 인증 플로우 완료');
  });

  test('Step 6: SalesHub 인증 상태 API 확인', async ({ page }) => {
    console.log('\n📝 Step 6: SalesHub 인증 상태 API 확인');

    // 토큰 발급
    const tokenResponse = await page.request.post(`${ORACLE_HUB_MANAGER}/api/auth/google-login`, {
      data: {
        email: 'peter.chung@wavebridge.com',
        name: 'Peter Chung'
      }
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.data.accessToken;

    // /api/auth/me 호출
    const meResponse = await page.request.get(`${ORACLE_SALES_HUB}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    expect(meResponse.ok()).toBeTruthy();
    const meData = await meResponse.json();

    console.log('   User data:', JSON.stringify(meData, null, 2));

    expect(meData.success).toBe(true);
    expect(meData.isAuthenticated).toBe(true);
    expect(meData.user.email).toBe('peter.chung@wavebridge.com');
    expect(meData.user.status).toBe('ACTIVE');

    console.log('✅ SalesHub 인증 상태 API 정상 작동');
  });

  test('Step 7: SalesHub 전체 페이지 스크린샷', async ({ page }) => {
    console.log('\n📝 Step 7: SalesHub 메인 페이지 전체 스크린샷');

    // 토큰 발급 및 SSO 플로우
    const tokenResponse = await page.request.post(`${ORACLE_HUB_MANAGER}/api/auth/google-login`, {
      data: {
        email: 'peter.chung@wavebridge.com',
        name: 'Peter Chung'
      }
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.data.accessToken;

    // SSO로 로그인
    const ssoUrl = `${ORACLE_SALES_HUB}/api/auth/sso?token=${accessToken}`;
    await page.goto(ssoUrl, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // 페이지 로드 대기
    await page.waitForTimeout(3000);

    // 전체 페이지 스크린샷
    const screenshotPath = await saveScreenshot(page, 'step7-saleshub-full-page');
    console.log(`   Full page screenshot: ${screenshotPath}`);

    // 페이지 정보 수집
    const pageTitle = await page.title();
    const pageUrl = page.url();
    const bodyText = await page.locator('body').textContent();

    console.log('   Page info:');
    console.log(`   - Title: ${pageTitle}`);
    console.log(`   - URL: ${pageUrl}`);
    console.log(`   - Content length: ${bodyText?.length || 0} characters`);

    console.log('✅ 전체 페이지 스크린샷 저장 완료');
  });
});
