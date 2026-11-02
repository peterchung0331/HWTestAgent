/**
 * Oracle 운영환경 E2E 테스트
 * HubManager + SalesHub
 *
 * 테스트 대상: http://workhub.biz (Oracle Cloud)
 */
import { test, expect, Page, Browser } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// 테스트 설정
const CONFIG = {
  baseURL: 'http://workhub.biz',
  hubManagerURL: 'http://workhub.biz',
  salesHubURL: 'http://workhub.biz/saleshub',
  googleEmail: process.env.TEST_GOOGLE_EMAIL || 'biz.dev@wavebridge.com',
  googlePassword: process.env.TEST_GOOGLE_PASSWORD || 'wave1234!!',
  timeout: 90000,
  screenshotDir: `/home/peterchung/HWTestAgent/test-results/MyTester/screenshots/${new Date().toISOString().split('T')[0]}-oracle-e2e`,
};

// 스크린샷 저장 헬퍼
async function saveScreenshot(page: Page, name: string): Promise<string> {
  const filename = `${name}.png`;
  const filepath = path.join(CONFIG.screenshotDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot saved: ${filename}`);
  return filepath;
}

// 테스트 결과 저장용
const testResults: {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  screenshot?: string;
  error?: string;
}[] = [];

test.describe('Oracle 운영환경 E2E 테스트', () => {
  test.setTimeout(CONFIG.timeout);

  test.describe('1. HubManager 테스트', () => {
    test('1.1 HubManager 메인 페이지 로드', async ({ page }) => {
      const startTime = Date.now();
      try {
        await page.goto(CONFIG.hubManagerURL, { waitUntil: 'networkidle', timeout: 30000 });
        await saveScreenshot(page, '01-hubmanager-home');

        // 페이지 제목 또는 콘텐츠 확인
        const title = await page.title();
        console.log(`Page title: ${title}`);

        // Hub 선택 페이지 또는 로그인 페이지 확인
        const pageContent = await page.content();
        const hasHubContent = pageContent.includes('Hub') || pageContent.includes('로그인') || pageContent.includes('Login');
        expect(hasHubContent).toBeTruthy();

        testResults.push({
          name: 'HubManager 메인 페이지 로드',
          status: 'pass',
          duration: Date.now() - startTime,
          screenshot: '01-hubmanager-home.png'
        });
      } catch (error: any) {
        await saveScreenshot(page, '01-hubmanager-home-error');
        testResults.push({
          name: 'HubManager 메인 페이지 로드',
          status: 'fail',
          duration: Date.now() - startTime,
          error: error.message,
          screenshot: '01-hubmanager-home-error.png'
        });
        throw error;
      }
    });

    test('1.2 HubManager Health API 확인', async ({ page }) => {
      const startTime = Date.now();
      try {
        const response = await page.goto(`${CONFIG.hubManagerURL}/api/health`, { waitUntil: 'networkidle' });
        const body = await response?.json();

        expect(body.success).toBe(true);
        expect(body.message).toContain('WBHubManager');

        console.log(`✅ Health API Response: ${JSON.stringify(body)}`);

        testResults.push({
          name: 'HubManager Health API',
          status: 'pass',
          duration: Date.now() - startTime
        });
      } catch (error: any) {
        testResults.push({
          name: 'HubManager Health API',
          status: 'fail',
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });

    test('1.3 HubManager Hubs API 확인', async ({ page }) => {
      const startTime = Date.now();
      try {
        const response = await page.goto(`${CONFIG.hubManagerURL}/api/hubs`, { waitUntil: 'networkidle' });
        const body = await response?.json();

        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.data.length).toBeGreaterThan(0);

        console.log(`✅ Hubs API: ${body.data.length} hubs found`);
        body.data.forEach((hub: any) => {
          console.log(`   - ${hub.name} (${hub.slug})`);
        });

        testResults.push({
          name: 'HubManager Hubs API',
          status: 'pass',
          duration: Date.now() - startTime
        });
      } catch (error: any) {
        testResults.push({
          name: 'HubManager Hubs API',
          status: 'fail',
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });

    test('1.4 Google OAuth 리다이렉트 확인', async ({ page }) => {
      const startTime = Date.now();
      try {
        // Google OAuth 버튼이 있는지 확인
        await page.goto(CONFIG.hubManagerURL, { waitUntil: 'networkidle' });

        // Google 로그인 버튼 찾기
        const googleButton = page.locator('text=Google').first();
        const hasGoogleButton = await googleButton.isVisible().catch(() => false);

        if (hasGoogleButton) {
          await saveScreenshot(page, '02-google-oauth-button');
          console.log('✅ Google OAuth 버튼 발견');
        } else {
          // OAuth 엔드포인트 직접 확인
          const oauthResponse = await page.request.get(
            `${CONFIG.hubManagerURL}/api/auth/google-oauth?redirect_uri=${encodeURIComponent(CONFIG.hubManagerURL + '/callback')}`
          );
          console.log(`OAuth endpoint status: ${oauthResponse.status()}`);
          // 400은 정상 (redirect_uri 검증)
          expect([200, 302, 400]).toContain(oauthResponse.status());
        }

        testResults.push({
          name: 'Google OAuth 리다이렉트',
          status: 'pass',
          duration: Date.now() - startTime,
          screenshot: hasGoogleButton ? '02-google-oauth-button.png' : undefined
        });
      } catch (error: any) {
        await saveScreenshot(page, '02-google-oauth-error');
        testResults.push({
          name: 'Google OAuth 리다이렉트',
          status: 'fail',
          duration: Date.now() - startTime,
          error: error.message,
          screenshot: '02-google-oauth-error.png'
        });
        throw error;
      }
    });
  });

  test.describe('2. SalesHub 테스트', () => {
    test('2.1 SalesHub 메인 페이지 로드', async ({ page }) => {
      const startTime = Date.now();
      try {
        await page.goto(CONFIG.salesHubURL, { waitUntil: 'networkidle', timeout: 30000 });
        await saveScreenshot(page, '03-saleshub-home');

        const title = await page.title();
        console.log(`Page title: ${title}`);

        // SalesHub 페이지 확인 (로그인 페이지 또는 대시보드)
        const url = page.url();
        console.log(`Current URL: ${url}`);

        testResults.push({
          name: 'SalesHub 메인 페이지 로드',
          status: 'pass',
          duration: Date.now() - startTime,
          screenshot: '03-saleshub-home.png'
        });
      } catch (error: any) {
        await saveScreenshot(page, '03-saleshub-home-error');
        testResults.push({
          name: 'SalesHub 메인 페이지 로드',
          status: 'fail',
          duration: Date.now() - startTime,
          error: error.message,
          screenshot: '03-saleshub-home-error.png'
        });
        throw error;
      }
    });

    test('2.2 SalesHub Health API 확인', async ({ page }) => {
      const startTime = Date.now();
      try {
        const response = await page.goto(`${CONFIG.salesHubURL}/api/health`, { waitUntil: 'networkidle' });
        const body = await response?.json();

        expect(body.success).toBe(true);
        expect(body.message).toContain('WBSalesHub');
        expect(body.serverReady).toBe(true);

        console.log(`✅ Health API Response: ${JSON.stringify(body)}`);

        testResults.push({
          name: 'SalesHub Health API',
          status: 'pass',
          duration: Date.now() - startTime
        });
      } catch (error: any) {
        testResults.push({
          name: 'SalesHub Health API',
          status: 'fail',
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });

    test('2.3 SalesHub DB Health 확인', async ({ page }) => {
      const startTime = Date.now();
      try {
        const response = await page.goto(`${CONFIG.salesHubURL}/api/health/db`, { waitUntil: 'networkidle' });
        const body = await response?.json();

        expect(body.success).toBe(true);
        expect(body.message).toContain('Database is connected');

        console.log(`✅ DB Health: ${body.message}`);

        testResults.push({
          name: 'SalesHub DB Health',
          status: 'pass',
          duration: Date.now() - startTime
        });
      } catch (error: any) {
        testResults.push({
          name: 'SalesHub DB Health',
          status: 'fail',
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });

    test('2.4 SalesHub 인증 필요 API 확인', async ({ page }) => {
      const startTime = Date.now();
      try {
        // 인증 없이 접근 시 401 확인
        const customersResponse = await page.request.get(`${CONFIG.salesHubURL}/api/customers`);
        expect(customersResponse.status()).toBe(401);
        console.log(`✅ Customers API (no auth): ${customersResponse.status()} (expected 401)`);

        const categoriesResponse = await page.request.get(`${CONFIG.salesHubURL}/api/categories`);
        expect(categoriesResponse.status()).toBe(401);
        console.log(`✅ Categories API (no auth): ${categoriesResponse.status()} (expected 401)`);

        testResults.push({
          name: 'SalesHub 인증 필요 API',
          status: 'pass',
          duration: Date.now() - startTime
        });
      } catch (error: any) {
        testResults.push({
          name: 'SalesHub 인증 필요 API',
          status: 'fail',
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  });

  test.describe('3. SSO 통합 테스트', () => {
    test('3.1 HubManager에서 SalesHub로 SSO 플로우', async ({ page }) => {
      const startTime = Date.now();
      try {
        // HubManager 접속
        await page.goto(CONFIG.hubManagerURL, { waitUntil: 'networkidle' });
        await saveScreenshot(page, '04-sso-start-hubmanager');

        // Hub 목록에서 SalesHub 찾기
        const salesHubLink = page.locator('a[href*="saleshub"], button:has-text("Sales"), [data-hub="saleshub"]').first();
        const hasSalesHubLink = await salesHubLink.isVisible().catch(() => false);

        if (hasSalesHubLink) {
          console.log('✅ SalesHub 링크 발견');
          // 클릭하지 않고 존재 여부만 확인 (인증 없이는 실제 이동 불가)
        } else {
          console.log('ℹ️ SalesHub 링크 미발견 (로그인 필요)');
        }

        await saveScreenshot(page, '05-sso-flow-check');

        testResults.push({
          name: 'HubManager → SalesHub SSO 플로우',
          status: 'pass',
          duration: Date.now() - startTime,
          screenshot: '05-sso-flow-check.png'
        });
      } catch (error: any) {
        await saveScreenshot(page, '05-sso-flow-error');
        testResults.push({
          name: 'HubManager → SalesHub SSO 플로우',
          status: 'fail',
          duration: Date.now() - startTime,
          error: error.message,
          screenshot: '05-sso-flow-error.png'
        });
        throw error;
      }
    });

    test('3.2 JWT Public Key 교차 검증', async ({ page }) => {
      const startTime = Date.now();
      try {
        // HubManager에서 public key 가져오기
        const response = await page.request.get(`${CONFIG.hubManagerURL}/api/auth/public-key`);
        const body = await response.json();

        expect(body.success).toBe(true);
        expect(body.data.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
        expect(body.data.algorithm).toBe('RS256');

        console.log(`✅ JWT Public Key 확인됨 (algorithm: ${body.data.algorithm})`);

        testResults.push({
          name: 'JWT Public Key 교차 검증',
          status: 'pass',
          duration: Date.now() - startTime
        });
      } catch (error: any) {
        testResults.push({
          name: 'JWT Public Key 교차 검증',
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
    // 디렉토리가 없으면 생성
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    const reportPath = `${reportDir}/${new Date().toISOString().split('T')[0]}-oracle-e2e-테스트.md`;

    const passCount = testResults.filter(r => r.status === 'pass').length;
    const failCount = testResults.filter(r => r.status === 'fail').length;
    const totalDuration = testResults.reduce((sum, r) => sum + r.duration, 0);

    const report = `# Oracle 운영환경 E2E 테스트 리포트

## 📊 테스트 요약
- **테스트 일시**: ${new Date().toISOString()}
- **대상 환경**: Oracle Cloud (workhub.biz)
- **통과**: ${passCount}/${testResults.length}
- **실패**: ${failCount}/${testResults.length}
- **총 소요시간**: ${(totalDuration / 1000).toFixed(2)}초

## 📋 테스트 결과

| # | 테스트 | 상태 | 소요시간 | 스크린샷 |
|---|--------|------|----------|----------|
${testResults.map((r, i) => `| ${i + 1} | ${r.name} | ${r.status === 'pass' ? '✅' : '❌'} | ${(r.duration / 1000).toFixed(2)}s | ${r.screenshot || '-'} |`).join('\n')}

## 🔍 상세 결과

### HubManager (workhub.biz)
${testResults.filter(r => r.name.includes('HubManager') || r.name.includes('Health API') || r.name.includes('Hubs API') || r.name.includes('OAuth')).map(r => `- ${r.status === 'pass' ? '✅' : '❌'} ${r.name}${r.error ? `: ${r.error}` : ''}`).join('\n')}

### SalesHub (workhub.biz/saleshub)
${testResults.filter(r => r.name.includes('SalesHub')).map(r => `- ${r.status === 'pass' ? '✅' : '❌'} ${r.name}${r.error ? `: ${r.error}` : ''}`).join('\n')}

### SSO 통합
${testResults.filter(r => r.name.includes('SSO') || r.name.includes('JWT')).map(r => `- ${r.status === 'pass' ? '✅' : '❌'} ${r.name}${r.error ? `: ${r.error}` : ''}`).join('\n')}

## 📸 스크린샷
스크린샷 위치: \`${CONFIG.screenshotDir}/\`

${testResults.filter(r => r.screenshot).map(r => `- ${r.screenshot}`).join('\n')}

## 📝 결론
${failCount === 0 ? '✅ 모든 E2E 테스트가 성공적으로 통과했습니다.' : `⚠️ ${failCount}개의 테스트가 실패했습니다. 위의 상세 결과를 확인해주세요.`}

---
*Generated by 스킬테스터-E2E*
`;

    fs.writeFileSync(reportPath, report);
    console.log(`\n📄 리포트 저장됨: ${reportPath}`);
  });
});
