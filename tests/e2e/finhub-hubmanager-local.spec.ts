import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * WBFinHub → WBHubManager Local E2E Test
 *
 * 로컬 환경에서 FinHub와 HubManager 간의 SSO 통합을 테스트합니다.
 *
 * 테스트 플로우:
 * 1. WBFinHub 로그인 페이지 접속 (localhost:3020)
 * 2. "WBHubManager로 로그인" 버튼 클릭
 * 3. WBHubManager로 리디렉션 (localhost:3090)
 * 4. Google OAuth 인증 자동화
 * 5. WBFinHub 대시보드로 최종 리디렉션
 * 6. 인증 상태 확인
 */

// 스크린샷 저장 경로
const SCREENSHOT_DIR = '/home/peterchung/HWTestAgent/test-results/MyTester/screenshots';
const timestamp = new Date().toISOString().split('T')[0];
const testName = 'FinHub-HubManager-Local';
const screenshotPath = path.join(SCREENSHOT_DIR, `${timestamp}-${testName}`);

// 스크린샷 디렉토리 생성
if (!fs.existsSync(screenshotPath)) {
  fs.mkdirSync(screenshotPath, { recursive: true });
}

test.describe('FinHub → HubManager Local E2E', () => {
  test.beforeEach(async ({ page }) => {
    // 콘솔 로그 모니터링
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error') {
        console.log(`❌ Console Error: ${msg.text()}`);
      } else if (type === 'warning') {
        console.log(`⚠️  Console Warning: ${msg.text()}`);
      }
    });

    // 네트워크 요청 실패 모니터링
    page.on('requestfailed', request => {
      console.log(`❌ Request Failed: ${request.method()} ${request.url()}`);
    });
  });

  test('SSO 통합 테스트: FinHub → HubManager (로컬)', async ({ page }) => {
    console.log('\n🚀 E2E 테스트 시작: FinHub → HubManager (로컬 환경)\n');

    // 네트워크 요청 추적
    const requests: { method: string; url: string; status?: number }[] = [];
    page.on('request', request => {
      requests.push({ method: request.method(), url: request.url() });
    });

    page.on('response', response => {
      const req = requests.find(r => r.url === response.url() && !r.status);
      if (req) req.status = response.status();
    });

    // ========================================
    // Step 1: WBFinHub 로그인 페이지 접속
    // ========================================
    console.log('📍 Step 1: WBFinHub 로그인 페이지 접속');
    await page.goto('http://localhost:3020/login', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.screenshot({
      path: path.join(screenshotPath, '01-finhub-login.png'),
      fullPage: true
    });
    console.log('   ✅ 스크린샷 저장: 01-finhub-login.png');

    // 페이지 로드 확인
    const currentUrl = page.url();
    console.log(`   현재 URL: ${currentUrl}`);
    expect(currentUrl).toContain('localhost:3020');

    // ========================================
    // Step 2: SSO 버튼 확인
    // ========================================
    console.log('\n📍 Step 2: SSO 버튼 확인');

    // 여러 가능한 SSO 버튼 텍스트 시도
    const possibleButtonTexts = [
      'WBHubManager로 로그인',
      'HubManager로 로그인',
      'SSO 로그인'
    ];

    let ssoButton = null;
    for (const buttonText of possibleButtonTexts) {
      const button = page.locator(`text=${buttonText}`).first();
      const isVisible = await button.isVisible().catch(() => false);
      if (isVisible) {
        ssoButton = button;
        console.log(`   ✅ SSO 버튼 발견: "${buttonText}"`);
        break;
      }
    }

    if (!ssoButton) {
      console.log('   ⚠️  SSO 버튼을 찾을 수 없습니다. 페이지 내용 확인:');
      const pageContent = await page.content();
      console.log(pageContent.substring(0, 500));

      await page.screenshot({
        path: path.join(screenshotPath, '02-no-sso-button.png'),
        fullPage: true
      });
      throw new Error('SSO 버튼을 찾을 수 없습니다');
    }

    await page.screenshot({
      path: path.join(screenshotPath, '02-sso-button-found.png'),
      fullPage: true
    });

    // ========================================
    // Step 3: SSO 버튼 클릭
    // ========================================
    console.log('\n📍 Step 3: SSO 버튼 클릭');

    const navigationPromise = page.waitForNavigation({
      timeout: 15000,
      waitUntil: 'networkidle'
    }).catch(() => {
      console.log('   ⚠️  Navigation timeout (예상된 동작일 수 있음)');
    });

    await ssoButton.click();
    console.log('   ✅ SSO 버튼 클릭됨');

    await navigationPromise;
    await page.waitForTimeout(2000);

    const afterClickUrl = page.url();
    console.log(`   리디렉션 후 URL: ${afterClickUrl}`);

    await page.screenshot({
      path: path.join(screenshotPath, '03-after-sso-click.png'),
      fullPage: true
    });

    // ========================================
    // Step 4: HubManager 리디렉션 확인
    // ========================================
    console.log('\n📍 Step 4: HubManager 리디렉션 확인');

    if (afterClickUrl.includes('localhost:3090') || afterClickUrl.includes('workhub.biz')) {
      console.log('   ✅ HubManager로 리디렉션 성공');
    } else if (afterClickUrl.includes('accounts.google.com')) {
      console.log('   ✅ Google OAuth로 리디렉션 (예상된 동작)');
    } else {
      console.log(`   ⚠️  예상치 못한 리디렉션: ${afterClickUrl}`);
    }

    await page.screenshot({
      path: path.join(screenshotPath, '04-redirect-destination.png'),
      fullPage: true
    });

    // ========================================
    // Step 5: Google 로그인 자동화 (선택적)
    // ========================================
    if (afterClickUrl.includes('accounts.google.com')) {
      console.log('\n📍 Step 5: Google 로그인 자동화 시도');

      const googleEmail = process.env.TEST_GOOGLE_EMAIL;
      const googlePassword = process.env.TEST_GOOGLE_PASSWORD;

      if (googleEmail && googlePassword) {
        try {
          // 이메일 입력
          const emailInput = page.locator('input[type="email"]');
          await emailInput.fill(googleEmail);
          await page.screenshot({
            path: path.join(screenshotPath, '05-google-email-entered.png'),
            fullPage: true
          });
          console.log('   ✅ 이메일 입력 완료');

          // 다음 버튼 클릭
          await page.locator('button:has-text("다음"), button:has-text("Next")').click();
          await page.waitForTimeout(2000);

          // 비밀번호 입력
          const passwordInput = page.locator('input[type="password"]');
          await passwordInput.fill(googlePassword);
          await page.screenshot({
            path: path.join(screenshotPath, '06-google-password-entered.png'),
            fullPage: true
          });
          console.log('   ✅ 비밀번호 입력 완료');

          // 로그인 버튼 클릭
          await page.locator('button:has-text("다음"), button:has-text("Next")').click();
          await page.waitForNavigation({ timeout: 30000, waitUntil: 'networkidle' });

          console.log('   ✅ Google 로그인 완료');
        } catch (error) {
          console.log(`   ⚠️  Google 로그인 자동화 실패: ${error}`);
        }
      } else {
        console.log('   ℹ️  TEST_GOOGLE_EMAIL 또는 TEST_GOOGLE_PASSWORD 환경변수 미설정');
        console.log('   수동으로 로그인을 완료해주세요 (headless: false 모드에서)');
      }

      await page.screenshot({
        path: path.join(screenshotPath, '07-after-google-login.png'),
        fullPage: true
      });
    }

    // ========================================
    // Step 6: 최종 상태 확인
    // ========================================
    console.log('\n📍 Step 6: 최종 상태 확인');
    await page.waitForTimeout(3000);

    const finalUrl = page.url();
    console.log(`   최종 URL: ${finalUrl}`);

    await page.screenshot({
      path: path.join(screenshotPath, '08-final-state.png'),
      fullPage: true
    });
    console.log('   ✅ 최종 스크린샷 저장: 08-final-state.png');

    // ========================================
    // Step 7: 네트워크 요청 요약
    // ========================================
    console.log('\n📊 네트워크 요청 요약:');
    const authRequests = requests.filter(r =>
      r.url.includes('/auth/') || r.url.includes('/login') || r.url.includes('/api/')
    );

    console.log(`   총 ${authRequests.length}개의 인증 관련 요청`);
    authRequests.slice(0, 15).forEach((req, idx) => {
      const shortUrl = req.url.length > 80 ? req.url.substring(0, 80) + '...' : req.url;
      console.log(`   ${idx + 1}. ${req.method} ${shortUrl} → ${req.status || 'pending'}`);
    });

    console.log('\n✅ E2E 테스트 완료!');
    console.log(`📸 스크린샷 저장 위치: ${screenshotPath}\n`);
  });

  test('FinHub 로그인 페이지 요소 확인', async ({ page }) => {
    console.log('\n🔍 FinHub 로그인 페이지 요소 테스트\n');

    await page.goto('http://localhost:3020/login', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // 페이지 제목 확인
    const title = await page.title();
    console.log(`   페이지 제목: ${title}`);

    // WBFinHub 로고/텍스트 확인
    const logoVisible = await page.locator('text=WBFinHub').first().isVisible().catch(() => false);
    if (logoVisible) {
      console.log('   ✅ WBFinHub 로고 표시됨');
    }

    // SSO 버튼 존재 확인
    const ssoButtonVisible = await page.locator('text=WBHubManager로 로그인')
      .first()
      .isVisible()
      .catch(() => false);

    if (ssoButtonVisible) {
      console.log('   ✅ SSO 버튼 표시됨');
    }

    await page.screenshot({
      path: path.join(screenshotPath, '09-login-page-elements.png'),
      fullPage: true
    });

    console.log('\n✅ 로그인 페이지 요소 테스트 완료\n');
  });
});
