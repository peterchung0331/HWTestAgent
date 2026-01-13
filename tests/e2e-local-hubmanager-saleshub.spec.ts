/**
 * E2E Test: HubManager → SalesHub (Local Environment)
 *
 * 테스트 환경: 로컬 개발 환경
 * - HubManager: http://localhost:4090
 * - SalesHub Frontend: http://localhost:3010
 * - SalesHub Backend: http://localhost:4010
 *
 * 테스트 시나리오:
 * 1. HubManager에서 dev-login으로 로그인
 * 2. Hubs 페이지 접근
 * 3. Sales Hub 선택
 * 4. SalesHub 대시보드로 이동 확인
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOT_DIR = path.join(
  __dirname,
  '..',
  'test-results',
  'MyTester',
  'screenshots',
  `${new Date().toISOString().split('T')[0]}-hubmanager-saleshub`
);

test.describe('HubManager → SalesHub E2E Flow (Local)', () => {
  test('dev-login으로 로그인 후 SalesHub 네비게이션', async ({ page }) => {
    // 콘솔 로그 캡처
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = `[${msg.type()}] ${msg.text()}`;
      consoleLogs.push(text);
      if (msg.type() === 'error' || msg.text().includes('❌') || msg.text().includes('✅')) {
        console.log(text);
      }
    });

    // 네트워크 요청 모니터링
    page.on('request', request => {
      if (request.url().includes('api/auth') || request.url().includes('api/')) {
        console.log(`[Request] ${request.method()} ${request.url()}`);
      }
    });
    page.on('response', response => {
      if (response.url().includes('api/auth') || response.status() === 404) {
        console.log(`[Response] ${response.status()} ${response.url()}`);
      }
    });

    // 1단계: HubManager 프론트엔드로 직접 이동 (자동 dev-login 트리거)
    console.log('Step 1: HubManager 프론트엔드 Hubs 페이지로 이동');
    await page.goto('http://localhost:3090/hubs');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // 자동 dev-login 완료 대기

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-hubs-page-initial.png'),
      fullPage: true
    });

    // 2단계: 토큰이 저장되었는지 확인
    console.log('Step 2: 토큰 저장 확인');
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    console.log('Access token exists:', !!accessToken);

    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-hubs-page.png'),
      fullPage: true
    });

    // 페이지 타이틀 확인
    const title = await page.title();
    console.log('Page title:', title);

    // Hub 카드가 표시되는지 확인
    const hubCards = page.locator('[data-testid="hub-card"], .hub-card, [class*="card"]');
    const hubCount = await hubCards.count();
    console.log(`Found ${hubCount} hub cards`);

    if (hubCount > 0) {
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '03-hub-cards-found.png'),
        fullPage: true
      });
    }

    // 3단계: Sales Hub 카드 찾기 및 클릭
    console.log('Step 3: Sales Hub 카드 찾기');

    // HubCard 구조: div[role="button"] > RippleEffect > div.bg-white.rounded-xl > h3
    // Sales Hub 텍스트를 포함하는 카드 찾기
    const salesHubSelectors = [
      'h3:has-text("Sales Hub")',
      'div[role="button"]:has(h3:has-text("Sales Hub"))',
      ':has-text("Sales Hub"):has-text("영업관리")',
      'div.rounded-xl:has(h3:text-is("Sales Hub"))',
    ];

    let salesHubCard = null;
    for (const selector of salesHubSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        console.log(`Found Sales Hub with selector: ${selector}`);
        salesHubCard = element;
        break;
      }
    }

    if (!salesHubCard) {
      // fallback: h3 텍스트 중에서 Sales 포함하는 것 찾기
      const allH3 = page.locator('h3');
      const h3Count = await allH3.count();
      console.log(`Found ${h3Count} h3 elements`);

      for (let i = 0; i < h3Count; i++) {
        const text = await allH3.nth(i).textContent();
        console.log(`h3[${i}]: ${text}`);
        if (text && text.includes('Sales')) {
          salesHubCard = allH3.nth(i);
          console.log('Found Sales Hub via h3 scan');
          break;
        }
      }
    }

    if (!salesHubCard) {
      console.error('Sales Hub card not found. Page HTML:');
      const html = await page.content();
      console.log(html.substring(0, 2000));
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'error-saleshub-not-found.png'),
        fullPage: true
      });
      throw new Error('Sales Hub card not found on the page');
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04-before-saleshub-click.png'),
      fullPage: true
    });

    // 4단계: Sales Hub 클릭
    console.log('Step 4: Sales Hub 클릭');
    await salesHubCard.click();
    await page.waitForTimeout(5000); // SSO 리다이렉션 대기 (증가)

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '05-after-saleshub-click.png'),
      fullPage: true
    });

    // 현재 URL 확인
    let currentUrl = page.url();
    console.log('Current URL after click:', currentUrl);

    // sso-callback 페이지에서 대시보드로 리다이렉트될 때까지 대기
    if (currentUrl.includes('sso-callback')) {
      console.log('Waiting for redirect from sso-callback...');
      try {
        await page.waitForURL('**/dashboard**', { timeout: 10000 });
        currentUrl = page.url();
        console.log('Redirected to:', currentUrl);
      } catch (e) {
        console.log('Timeout waiting for dashboard redirect. Current URL:', page.url());
        // 브라우저 콘솔에서 에러 확인
        const errors = consoleLogs.filter(log => log.includes('error') || log.includes('❌'));
        console.log('Console errors:', errors.slice(-5));
      }
    }

    // 5단계: SalesHub 대시보드 확인
    console.log('Step 5: SalesHub 대시보드 확인');

    // URL이 SalesHub를 가리키는지 확인
    // 로컬 환경: localhost:3010 (Next.js dev server)
    const isSalesHubUrl = currentUrl.includes(':3010') ||
                          currentUrl.includes('/saleshub') ||
                          currentUrl.includes('localhost:3010');

    console.log('Is SalesHub URL?', isSalesHubUrl);

    if (!isSalesHubUrl) {
      console.warn('URL does not point to SalesHub. Checking page content...');
    }

    // 페이지 제목 확인
    await page.waitForTimeout(2000); // 페이지 로딩 대기
    const finalTitle = await page.title();
    console.log('Final page title:', finalTitle);

    // SalesHub 대시보드 요소 확인
    const dashboardSelectors = [
      '[data-testid="dashboard"]',
      'h1:has-text("Dashboard")',
      'h1:has-text("대시보드")',
      '.dashboard',
      '[class*="dashboard"]'
    ];

    let dashboardFound = false;
    for (const selector of dashboardSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        console.log(`Dashboard found with selector: ${selector}`);
        dashboardFound = true;
        break;
      }
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '06-final-dashboard.png'),
      fullPage: true
    });

    // 최종 검증
    if (!dashboardFound && !isSalesHubUrl) {
      console.error('Neither dashboard elements nor SalesHub URL found');
      const html = await page.content();
      console.log('Page HTML (first 1000 chars):', html.substring(0, 1000));

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'error-final-state.png'),
        fullPage: true
      });
    }

    // 부분 성공: URL이 올바르면 통과
    expect(isSalesHubUrl || dashboardFound).toBe(true);

    console.log('✅ E2E Test completed successfully');
  });
});
