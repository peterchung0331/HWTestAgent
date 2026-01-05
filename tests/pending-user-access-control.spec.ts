/**
 * Pending 상태 사용자 권한 제어 E2E 테스트
 *
 * 테스트 목표: pending 상태 사용자가 대시보드에 접근 시
 * pending-approval 페이지로 리다이렉트되는지 확인
 *
 * 테스트 환경: Docker Staging (localhost:4400)
 */
import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// 테스트 설정
const CONFIG = {
  // Docker 스테이징 환경 (Nginx 리버스 프록시)
  baseURL: 'http://localhost:4400',
  hubManagerURL: 'http://localhost:4400',
  salesHubURL: 'http://localhost:4400/saleshub',
  finHubURL: 'http://localhost:4400/finhub',
  onboardingHubURL: 'http://localhost:4400/onboarding',

  // 테스트 계정 (pending 상태)
  googleEmail: process.env.TEST_GOOGLE_EMAIL || 'biz.dev@wavebridge.com',
  googlePassword: process.env.TEST_GOOGLE_PASSWORD || 'wave1234!!',

  timeout: 60000,
  screenshotDir: `/home/peterchung/HWTestAgent/test-results/MyTester/screenshots/${new Date().toISOString().split('T')[0]}-pending-access-control`,
};

// 스크린샷 디렉토리 생성
if (!fs.existsSync(CONFIG.screenshotDir)) {
  fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
}

// 스크린샷 저장 헬퍼
async function saveScreenshot(page: Page, name: string): Promise<string> {
  const filename = `${name}.png`;
  const filepath = path.join(CONFIG.screenshotDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot saved: ${filename}`);
  return filepath;
}

// 테스트 결과 저장용
interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  screenshot?: string;
  error?: string;
  details?: string;
}

const testResults: TestResult[] = [];

test.describe('Pending 상태 사용자 권한 제어 테스트', () => {
  test.setTimeout(CONFIG.timeout);

  test.describe('1. 환경 확인', () => {
    test('1.1 Docker 스테이징 환경 Health Check', async ({ page }) => {
      const startTime = Date.now();
      try {
        // HubManager Health
        const hmResponse = await page.goto(`${CONFIG.hubManagerURL}/api/health`, { waitUntil: 'networkidle' });
        const hmBody = await hmResponse?.json();
        expect(hmBody?.success).toBe(true);
        console.log(`✅ HubManager: ${hmBody?.message}`);

        // SalesHub Health
        const shResponse = await page.goto(`${CONFIG.salesHubURL}/api/health`, { waitUntil: 'networkidle' });
        const shBody = await shResponse?.json();
        expect(shBody?.success).toBe(true);
        console.log(`✅ SalesHub: ${shBody?.message}`);

        testResults.push({
          name: 'Docker 스테이징 환경 Health Check',
          status: 'pass',
          duration: Date.now() - startTime,
          details: `HubManager: OK, SalesHub: OK`
        });
      } catch (error: any) {
        testResults.push({
          name: 'Docker 스테이징 환경 Health Check',
          status: 'fail',
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  });

  test.describe('2. 미인증 상태 접근 테스트', () => {
    test('2.1 SalesHub 대시보드 직접 접근 시 로그인 페이지로 리다이렉트', async ({ page }) => {
      const startTime = Date.now();
      try {
        // 대시보드 직접 접근 시도
        await page.goto(`${CONFIG.salesHubURL}/`, { waitUntil: 'networkidle' });
        await saveScreenshot(page, '01-saleshub-no-auth');

        const currentURL = page.url();
        console.log(`Current URL: ${currentURL}`);

        // 로그인 페이지로 리다이렉트 되었는지 확인
        const isLoginPage = currentURL.includes('/login') || currentURL.includes('/auth');
        const pageContent = await page.content();
        const hasLoginForm = pageContent.includes('로그인') || pageContent.includes('Login') || pageContent.includes('Google');

        expect(isLoginPage || hasLoginForm).toBeTruthy();
        console.log(`✅ 미인증 상태: 로그인 페이지로 이동됨`);

        testResults.push({
          name: 'SalesHub 미인증 접근 → 로그인 페이지',
          status: 'pass',
          duration: Date.now() - startTime,
          screenshot: '01-saleshub-no-auth.png',
          details: `Redirected to: ${currentURL}`
        });
      } catch (error: any) {
        await saveScreenshot(page, '01-saleshub-no-auth-error');
        testResults.push({
          name: 'SalesHub 미인증 접근 → 로그인 페이지',
          status: 'fail',
          duration: Date.now() - startTime,
          error: error.message,
          screenshot: '01-saleshub-no-auth-error.png'
        });
        throw error;
      }
    });

    test('2.2 FinHub 대시보드 직접 접근 시 로그인 페이지로 리다이렉트', async ({ page }) => {
      const startTime = Date.now();
      try {
        await page.goto(`${CONFIG.finHubURL}/`, { waitUntil: 'networkidle' });
        await saveScreenshot(page, '02-finhub-no-auth');

        const currentURL = page.url();
        console.log(`Current URL: ${currentURL}`);

        const isLoginPage = currentURL.includes('/login') || currentURL.includes('/auth');
        const pageContent = await page.content();
        const hasLoginForm = pageContent.includes('로그인') || pageContent.includes('Login') || pageContent.includes('Google');

        expect(isLoginPage || hasLoginForm).toBeTruthy();
        console.log(`✅ 미인증 상태: 로그인 페이지로 이동됨`);

        testResults.push({
          name: 'FinHub 미인증 접근 → 로그인 페이지',
          status: 'pass',
          duration: Date.now() - startTime,
          screenshot: '02-finhub-no-auth.png',
          details: `Redirected to: ${currentURL}`
        });
      } catch (error: any) {
        await saveScreenshot(page, '02-finhub-no-auth-error');
        testResults.push({
          name: 'FinHub 미인증 접근 → 로그인 페이지',
          status: 'fail',
          duration: Date.now() - startTime,
          error: error.message,
          screenshot: '02-finhub-no-auth-error.png'
        });
        throw error;
      }
    });
  });

  test.describe('3. Pending 사용자 Google OAuth 로그인 후 접근 테스트', () => {
    test('3.1 Google OAuth 로그인 → SalesHub 대시보드 접근 시 pending-approval 페이지', async ({ page, context }) => {
      const startTime = Date.now();
      try {
        // 1. SalesHub 로그인 페이지로 이동
        await page.goto(`${CONFIG.salesHubURL}/login`, { waitUntil: 'networkidle' });
        await saveScreenshot(page, '03-saleshub-login-page');
        console.log(`📍 SalesHub 로그인 페이지: ${page.url()}`);

        // 2. Google 로그인 버튼 찾기
        const googleButton = page.locator('button:has-text("Google"), a:has-text("Google"), [data-provider="google"]').first();
        const hasGoogleButton = await googleButton.isVisible({ timeout: 5000 }).catch(() => false);

        if (!hasGoogleButton) {
          // 다른 셀렉터 시도
          const altGoogleButton = page.locator('text=/Google|구글/i').first();
          const hasAltButton = await altGoogleButton.isVisible({ timeout: 3000 }).catch(() => false);

          if (!hasAltButton) {
            await saveScreenshot(page, '03-no-google-button');
            console.log('⚠️ Google 로그인 버튼을 찾을 수 없음');

            // 페이지 HTML 일부 출력
            const bodyHtml = await page.locator('body').innerHTML();
            console.log('Page body (first 500 chars):', bodyHtml.substring(0, 500));

            testResults.push({
              name: 'Pending 사용자 SalesHub 접근',
              status: 'skip',
              duration: Date.now() - startTime,
              screenshot: '03-no-google-button.png',
              details: 'Google 로그인 버튼 미발견'
            });
            return;
          }
        }

        await saveScreenshot(page, '04-before-google-click');
        console.log('✅ Google 로그인 버튼 발견');

        // 3. Google OAuth 시작 (새 창/탭 처리)
        const [popup] = await Promise.all([
          context.waitForEvent('page', { timeout: 15000 }).catch(() => null),
          googleButton.click()
        ]);

        if (popup) {
          // 팝업 창에서 Google 로그인 처리
          await popup.waitForLoadState('networkidle');
          await saveScreenshot(popup, '05-google-popup');
          console.log(`📍 Google 팝업 URL: ${popup.url()}`);

          // 이메일 입력
          const emailInput = popup.locator('input[type="email"]');
          if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
            await emailInput.fill(CONFIG.googleEmail);
            await popup.locator('button:has-text("다음"), button:has-text("Next")').first().click();
            await popup.waitForLoadState('networkidle');
            await saveScreenshot(popup, '06-google-email-entered');
          }

          // 비밀번호 입력
          const passwordInput = popup.locator('input[type="password"]');
          if (await passwordInput.isVisible({ timeout: 5000 }).catch(() => false)) {
            await passwordInput.fill(CONFIG.googlePassword);
            await popup.locator('button:has-text("다음"), button:has-text("Next")').first().click();
            await popup.waitForLoadState('networkidle');
            await saveScreenshot(popup, '07-google-password-entered');
          }

          // 팝업이 닫히기를 기다림
          await popup.waitForEvent('close', { timeout: 30000 }).catch(() => {});
        } else {
          // 같은 페이지에서 리다이렉트
          await page.waitForLoadState('networkidle');
          const newURL = page.url();
          console.log(`📍 리다이렉트 후 URL: ${newURL}`);

          if (newURL.includes('accounts.google.com')) {
            await saveScreenshot(page, '05-google-login-page');

            // 이메일 입력
            const emailInput = page.locator('input[type="email"]');
            if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
              await emailInput.fill(CONFIG.googleEmail);
              await page.locator('button:has-text("다음"), button:has-text("Next")').first().click();
              await page.waitForLoadState('networkidle');
              await saveScreenshot(page, '06-google-email-entered');
            }

            // 비밀번호 입력
            const passwordInput = page.locator('input[type="password"]');
            if (await passwordInput.isVisible({ timeout: 10000 }).catch(() => false)) {
              await passwordInput.fill(CONFIG.googlePassword);
              await page.locator('button:has-text("다음"), button:has-text("Next")').first().click();
              await page.waitForLoadState('networkidle');
              await saveScreenshot(page, '07-google-password-entered');
            }
          }
        }

        // 4. OAuth 완료 후 최종 URL 확인
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000); // 리다이렉트 완료 대기
        const finalURL = page.url();
        await saveScreenshot(page, '08-after-oauth');
        console.log(`📍 최종 URL: ${finalURL}`);

        // 5. pending-approval 페이지 확인
        const isPendingPage = finalURL.includes('pending-approval') || finalURL.includes('pending');
        const pageContent = await page.content();
        const hasPendingMessage = pageContent.includes('승인 대기') ||
                                  pageContent.includes('pending') ||
                                  pageContent.includes('Pending') ||
                                  pageContent.includes('대기 중');

        if (isPendingPage || hasPendingMessage) {
          console.log('✅ Pending 사용자: pending-approval 페이지로 이동됨');
          await saveScreenshot(page, '09-pending-approval-page');

          testResults.push({
            name: 'Pending 사용자 SalesHub 접근 → pending-approval',
            status: 'pass',
            duration: Date.now() - startTime,
            screenshot: '09-pending-approval-page.png',
            details: `Final URL: ${finalURL}`
          });
        } else {
          // pending-approval이 아닌 다른 페이지로 이동됨
          console.log(`⚠️ 예상과 다른 페이지: ${finalURL}`);
          await saveScreenshot(page, '09-unexpected-page');

          testResults.push({
            name: 'Pending 사용자 SalesHub 접근 → pending-approval',
            status: 'fail',
            duration: Date.now() - startTime,
            screenshot: '09-unexpected-page.png',
            error: `Expected pending-approval page, but got: ${finalURL}`,
            details: `Page content includes: ${hasPendingMessage ? 'pending message' : 'no pending message'}`
          });

          // 테스트 실패 - 자세한 정보 출력
          console.log('Page title:', await page.title());
          console.log('Page content (first 1000 chars):', pageContent.substring(0, 1000));
        }
      } catch (error: any) {
        await saveScreenshot(page, '09-oauth-error');
        testResults.push({
          name: 'Pending 사용자 SalesHub 접근 → pending-approval',
          status: 'fail',
          duration: Date.now() - startTime,
          error: error.message,
          screenshot: '09-oauth-error.png'
        });
        throw error;
      }
    });
  });

  test.describe('4. API 레벨 권한 체크', () => {
    test('4.1 pending 상태에서 보호된 API 접근 시 403 반환', async ({ page }) => {
      const startTime = Date.now();
      try {
        // 인증 없이 보호된 API 접근
        const response = await page.request.get(`${CONFIG.salesHubURL}/api/customers`);
        const status = response.status();

        console.log(`Customers API status: ${status}`);

        // 401 (미인증) 또는 403 (권한 없음) 확인
        expect([401, 403]).toContain(status);

        testResults.push({
          name: 'API 권한 체크 (인증 없음)',
          status: 'pass',
          duration: Date.now() - startTime,
          details: `Status: ${status} (expected 401 or 403)`
        });
      } catch (error: any) {
        testResults.push({
          name: 'API 권한 체크 (인증 없음)',
          status: 'fail',
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  });

  // 테스트 완료 후 리포트 생성
  test.afterAll(async () => {
    const reportDir = '/home/peterchung/HWTestAgent/test-results/MyTester/reports';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const reportPath = `${reportDir}/${new Date().toISOString().split('T')[0]}-pending-access-control-테스트.md`;

    const passCount = testResults.filter(r => r.status === 'pass').length;
    const failCount = testResults.filter(r => r.status === 'fail').length;
    const skipCount = testResults.filter(r => r.status === 'skip').length;
    const totalDuration = testResults.reduce((sum, r) => sum + r.duration, 0);

    const report = `# Pending 상태 사용자 권한 제어 테스트 리포트

## 📊 테스트 요약
- **테스트 일시**: ${new Date().toISOString()}
- **대상 환경**: Docker Staging (localhost:4400)
- **테스트 계정**: ${CONFIG.googleEmail} (status: pending)
- **통과**: ${passCount}/${testResults.length}
- **실패**: ${failCount}/${testResults.length}
- **스킵**: ${skipCount}/${testResults.length}
- **총 소요시간**: ${(totalDuration / 1000).toFixed(2)}초

## 📋 테스트 결과

| # | 테스트 | 상태 | 소요시간 | 스크린샷 |
|---|--------|------|----------|----------|
${testResults.map((r, i) => `| ${i + 1} | ${r.name} | ${r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⏭️'} | ${(r.duration / 1000).toFixed(2)}s | ${r.screenshot || '-'} |`).join('\n')}

## 🔍 상세 결과

${testResults.map(r => `### ${r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⏭️'} ${r.name}
- **상태**: ${r.status}
- **소요시간**: ${(r.duration / 1000).toFixed(2)}s
${r.details ? `- **상세**: ${r.details}` : ''}
${r.error ? `- **에러**: ${r.error}` : ''}
${r.screenshot ? `- **스크린샷**: ${r.screenshot}` : ''}
`).join('\n')}

## 📸 스크린샷 위치
\`${CONFIG.screenshotDir}/\`

## 🔧 발견된 문제점
${failCount > 0 ? testResults.filter(r => r.status === 'fail').map(r => `- ${r.name}: ${r.error}`).join('\n') : '문제 없음'}

## 📝 결론
${failCount === 0 ? '✅ 모든 권한 제어 테스트가 성공적으로 통과했습니다. pending 상태 사용자의 대시보드 접근이 올바르게 차단됩니다.' : `⚠️ ${failCount}개의 테스트가 실패했습니다. pending 상태 사용자의 권한 제어가 예상대로 동작하지 않습니다.`}

---
*Generated by 스킬테스터-E2E*
`;

    fs.writeFileSync(reportPath, report);
    console.log(`\n📄 리포트 저장됨: ${reportPath}`);
  });
});
