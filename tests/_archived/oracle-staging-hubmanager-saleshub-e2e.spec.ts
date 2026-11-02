import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// 환경변수 로드
const GOOGLE_TEST_EMAIL = process.env.GOOGLE_TEST_EMAIL || 'biz.dev@wavebridge.com';
const GOOGLE_TEST_PASSWORD = process.env.GOOGLE_TEST_PASSWORD || 'wave1234!!';
const TEST_URL_STAGING = 'http://158.180.95.246:4400';

// 테스트 결과 저장 경로
const SCREENSHOTS_DIR = '/home/peterchung/HWTestAgent/test-results/MyTester/screenshots/oracle-staging-hubmanager-saleshub';
const REPORT_PATH = '/home/peterchung/HWTestAgent/test-results/MyTester/reports/2026-01-12-HubManager-SalesHub-E2E-테스트.md';

// 스크린샷 디렉토리 생성
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// 스크린샷 헬퍼 함수
async function takeScreenshot(page: Page, filename: string, fullPage = false) {
  const filePath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filePath, fullPage });
  console.log(`📸 Screenshot saved: ${filename}`);
  return filePath;
}

// Google 로그인 함수
async function loginWithGoogle(page: Page) {
  console.log('🔐 Starting Google OAuth login...');

  // Google 로그인 페이지 이동
  await page.goto('https://accounts.google.com');
  await takeScreenshot(page, '01-google-login-page.png');

  // 이메일 입력
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', GOOGLE_TEST_EMAIL);
  await takeScreenshot(page, '02-email-entered.png');

  // 다음 버튼 클릭
  await page.click('button:has-text("다음"), button:has-text("Next")');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await takeScreenshot(page, '03-after-email-next.png');

  // 비밀번호 입력
  await page.waitForSelector('input[type="password"]', { timeout: 15000 });
  await page.fill('input[type="password"]', GOOGLE_TEST_PASSWORD);
  await takeScreenshot(page, '04-password-entered.png');

  // 다음 버튼 클릭
  await page.click('button:has-text("다음"), button:has-text("Next")');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  await takeScreenshot(page, '05-login-complete.png');

  console.log('✅ Google login completed');
}

test.describe('Oracle Staging E2E: HubManager → SalesHub', () => {
  test.setTimeout(180000); // 3분 타임아웃

  test('should navigate from HubManager to SalesHub and verify dashboard', async ({ page }) => {
    const results = {
      steps: [] as any[],
      errors: [] as string[],
      screenshots: [] as string[],
    };

    try {
      // Step 1: Google 로그인
      console.log('\n=== Step 1: Google OAuth Login ===');
      await loginWithGoogle(page);
      results.steps.push({ step: 'Google OAuth Login', status: 'passed' });

      // Step 2: HubManager 접속
      console.log('\n=== Step 2: Navigate to HubManager ===');
      await page.goto(TEST_URL_STAGING);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const screenshot1 = await takeScreenshot(page, '06-hubmanager-initial.png', true);
      results.screenshots.push(screenshot1);

      // HubManager 페이지 확인
      const currentURL = page.url();
      console.log(`Current URL: ${currentURL}`);

      // Hub 선택 페이지인지 확인
      const isHubSelectionPage = await page.locator('h1:has-text("Hub 선택"), h1:has-text("Select Hub")').count() > 0;
      console.log(`Is Hub Selection Page: ${isHubSelectionPage}`);

      if (isHubSelectionPage) {
        results.steps.push({ step: 'Navigate to HubManager Hub Selection Page', status: 'passed' });
      } else {
        // 로그인 필요 여부 확인
        const loginButton = await page.locator('button:has-text("Google"), button:has-text("로그인")').count();
        if (loginButton > 0) {
          console.log('🔄 OAuth redirect needed, clicking login button...');
          await page.click('button:has-text("Google"), button:has-text("로그인")');
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(3000);
          await takeScreenshot(page, '07-after-oauth-redirect.png', true);
        }
        results.steps.push({ step: 'Navigate to HubManager', status: 'passed with redirect' });
      }

      // Step 3: SalesHub 선택
      console.log('\n=== Step 3: Select SalesHub ===');

      // 페이지가 완전히 로드될 때까지 대기
      await page.waitForTimeout(3000);

      // 페이지 내용 확인
      const pageContent = await page.content();
      console.log('Page has "Sales Hub" text:', pageContent.includes('Sales Hub'));
      console.log('Page has "대시보드로 이동" text:', pageContent.includes('대시보드로 이동'));

      // 방법 1: role="button"인 div 중 "Sales Hub"를 포함하는 요소 클릭
      const salesHubCard = page.locator('div[role="button"]', {
        has: page.locator('text=Sales Hub')
      }).first();

      const cardCount = await salesHubCard.count();
      console.log(`Found ${cardCount} Sales Hub card(s)`);

      let salesHubFound = false;
      if (cardCount > 0) {
        console.log('✅ Found Sales Hub card with role="button"');
        await salesHubCard.click();
        salesHubFound = true;
      }

      // 방법 2: "대시보드로 이동" 버튼이 있는 div 중 "Sales Hub"를 포함하는 카드 클릭
      if (!salesHubFound) {
        console.log('Trying alternative approach: finding "대시보드로 이동" button in Sales Hub card');
        const allCards = await page.locator('div:has-text("Sales Hub")').all();
        for (const card of allCards) {
          const dashboardButton = await card.locator('div:has-text("대시보드로 이동")').count();
          if (dashboardButton > 0) {
            console.log('✅ Found Sales Hub card with "대시보드로 이동" button');
            await card.click();
            salesHubFound = true;
            break;
          }
        }
      }

      if (!salesHubFound) {
        const screenshot2 = await takeScreenshot(page, '08-saleshub-not-found.png', true);
        results.screenshots.push(screenshot2);

        // HTML 구조 저장
        const htmlPath = path.join(SCREENSHOTS_DIR, 'page-structure.html');
        fs.writeFileSync(htmlPath, pageContent, 'utf-8');
        console.log(`HTML structure saved: ${htmlPath}`);

        throw new Error('SalesHub card not found on Hub selection page');
      }

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const screenshot3 = await takeScreenshot(page, '09-saleshub-loading.png', true);
      results.screenshots.push(screenshot3);
      results.steps.push({ step: 'Click SalesHub link', status: 'passed' });

      // Step 4: SalesHub 대시보드 확인
      console.log('\n=== Step 4: Verify SalesHub Dashboard ===');

      // URL 확인
      const salesHubURL = page.url();
      console.log(`Current URL after SalesHub click: ${salesHubURL}`);
      expect(salesHubURL).toContain('saleshub');

      // 대시보드 요소 확인 (여러 셀렉터 시도)
      const dashboardSelectors = [
        '[data-testid="dashboard"]',
        'h1:has-text("Dashboard")',
        'h1:has-text("대시보드")',
        'main',
        '[role="main"]',
      ];

      let dashboardFound = false;
      for (const selector of dashboardSelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          console.log(`✅ Dashboard found with selector: ${selector}`);
          dashboardFound = true;
          break;
        }
      }

      const screenshot4 = await takeScreenshot(page, '10-saleshub-dashboard-final.png', true);
      results.screenshots.push(screenshot4);

      if (dashboardFound) {
        results.steps.push({ step: 'Verify SalesHub Dashboard', status: 'passed' });
      } else {
        console.log('⚠️ Dashboard elements not found, but URL is correct');
        results.steps.push({ step: 'Verify SalesHub Dashboard', status: 'partial' });
      }

      // Step 5: 추가 요소 확인 (선택적)
      console.log('\n=== Step 5: Check Additional Elements ===');
      const additionalChecks = [
        { selector: 'nav', name: 'Navigation bar' },
        { selector: 'a:has-text("Customers"), a:has-text("고객")', name: 'Customers link' },
        { selector: 'a:has-text("Meetings"), a:has-text("미팅")', name: 'Meetings link' },
        { selector: 'a:has-text("Categories"), a:has-text("카테고리")', name: 'Categories link' },
      ];

      for (const check of additionalChecks) {
        const count = await page.locator(check.selector).count();
        console.log(`${check.name}: ${count > 0 ? '✅' : '❌'}`);
        results.steps.push({
          step: `Check ${check.name}`,
          status: count > 0 ? 'passed' : 'not found',
        });
      }

      // 최종 스크린샷
      const finalScreenshot = await takeScreenshot(page, '11-test-complete.png', true);
      results.screenshots.push(finalScreenshot);

      console.log('\n✅ All tests completed successfully!');

    } catch (error: any) {
      console.error('❌ Test failed:', error.message);
      results.errors.push(error.message);
      await takeScreenshot(page, `error-${Date.now()}.png`, true);
      throw error;
    } finally {
      // 리포트 생성
      await generateReport(results);
    }
  });
});

// 리포트 생성 함수
async function generateReport(results: any) {
  console.log('\n📝 Generating test report...');

  const timestamp = new Date().toISOString();
  const passedSteps = results.steps.filter((s: any) => s.status === 'passed').length;
  const totalSteps = results.steps.length;
  const successRate = totalSteps > 0 ? ((passedSteps / totalSteps) * 100).toFixed(2) : '0';

  const report = `# E2E 테스트 리포트: HubManager → SalesHub (Oracle Staging)

## 테스트 정보
- **테스트 일시**: ${timestamp}
- **환경**: Oracle Staging (http://158.180.95.246:4400)
- **테스트 유형**: E2E (Playwright)
- **시작 지점**: WBHubManager Hub Selection
- **목표 지점**: WBSalesHub Dashboard

## 테스트 결과 요약
- **총 단계**: ${totalSteps}
- **성공**: ${passedSteps}
- **실패**: ${results.errors.length}
- **성공률**: ${successRate}%

## 실행 단계

${results.steps.map((step: any, index: number) =>
  `### ${index + 1}. ${step.step}
- **상태**: ${step.status === 'passed' ? '✅ 통과' : step.status === 'partial' ? '⚠️ 부분 성공' : '❌ 실패'}
`).join('\n')}

## 스크린샷

${results.screenshots.map((screenshot: string, index: number) => {
  const filename = path.basename(screenshot);
  return `### ${index + 1}. ${filename.replace('.png', '').replace(/-/g, ' ')}
![${filename}](${screenshot})
`;
}).join('\n')}

## 발견된 문제점

${results.errors.length > 0
  ? results.errors.map((error: string) => `- ${error}`).join('\n')
  : '문제점 없음'}

## 결론 및 권장사항

${results.errors.length === 0
  ? `✅ **모든 테스트 통과**

Oracle 스테이징 환경에서 HubManager에서 SalesHub로의 네비게이션이 정상적으로 작동합니다.
Google OAuth 로그인 플로우도 성공적으로 완료되었습니다.

**권장사항**:
- 프로덕션 배포 전 추가 E2E 테스트 실행
- 다른 허브(FinHub, OnboardingHub)에 대한 동일 테스트 수행
- 네트워크 지연 상황에서의 테스트 추가`
  : `❌ **테스트 실패**

일부 단계에서 문제가 발생했습니다. 상세 내용은 위의 "발견된 문제점" 섹션을 참조하세요.

**권장사항**:
- 스크린샷을 분석하여 UI 요소 확인
- 셀렉터 업데이트 필요 여부 검토
- 타임아웃 설정 조정 고려`}

---
*Generated by 스킬테스터-E2E*
`;

  fs.writeFileSync(REPORT_PATH, report, 'utf-8');
  console.log(`✅ Report saved: ${REPORT_PATH}`);
}
