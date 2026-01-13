import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HUBS = [
  { name: 'HubManager', frontend: 3090, backend: 4090, devLoginPath: '/api/auth/dev-login', dashboardPath: '/hubs' },
  { name: 'SalesHub', frontend: 3010, backend: 4010, devLoginPath: '/auth/dev-login', dashboardPath: '/' },
  { name: 'FinHub', frontend: 3020, backend: 4020, devLoginPath: '/auth/dev-login', dashboardPath: '/dashboard' },
  { name: 'OnboardingHub', frontend: 3030, backend: 4030, devLoginPath: '/auth/dev-login', dashboardPath: '/' },
];

test.describe('모든 허브 개발 모드 로그인 테스트', () => {
  test.setTimeout(180000);

  for (const hub of HUBS) {
    test(`${hub.name} 개발 모드 로그인`, async ({ page }) => {
      const SCREENSHOT_DIR = path.join(__dirname, `../test-results/dev-login-screenshots/${hub.name.toLowerCase()}`);

      if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
      }

      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔍 ${hub.name} 개발 모드 로그인 테스트 시작...`);
      console.log(`${'='.repeat(60)}\n`);

      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
          console.log(`❌ Console Error: ${msg.text()}`);
        }
      });

      try {
        // 1. 로그인 페이지로 이동
        console.log(`📊 Step 1: 로그인 페이지 접속`);
        const loginUrl = `http://localhost:${hub.frontend}/login`;
        await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, '01-login-page.png'),
          fullPage: true
        });

        // 2. 개발 모드 로그인 버튼 찾기
        console.log(`📊 Step 2: 개발 모드 로그인 버튼 확인`);
        const devLoginButton = page.locator('button:has-text("개발 모드 로그인"), button:has(svg)').first();
        const isVisible = await devLoginButton.isVisible().catch(() => false);

        if (!isVisible) {
          console.log('⚠️ 개발 모드 로그인 버튼이 보이지 않습니다. 페이지 확인...');
          const bodyText = await page.locator('body').textContent();
          console.log(`Body text (first 300 chars): ${bodyText?.substring(0, 300)}`);
          throw new Error('개발 모드 로그인 버튼을 찾을 수 없습니다');
        }

        console.log('✅ 개발 모드 로그인 버튼 발견');
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, '02-dev-login-button-found.png'),
          fullPage: true
        });

        // 3. 개발 모드 로그인 버튼 클릭
        console.log(`📊 Step 3: 개발 모드 로그인 버튼 클릭`);
        await devLoginButton.click();

        // 4. 리다이렉트 대기 및 최종 URL 확인
        console.log(`📊 Step 4: 인증 완료 후 리다이렉트 대기...`);
        await page.waitForLoadState('networkidle', { timeout: 60000 });
        await page.waitForTimeout(3000); // 추가 대기

        const finalUrl = page.url();
        console.log(`📍 Final URL: ${finalUrl}`);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, '03-after-login.png'),
          fullPage: true
        });

        // 5. 대시보드 도달 확인
        console.log(`📊 Step 5: 대시보드 도달 확인`);

        const isDashboard =
          finalUrl.includes(hub.dashboardPath) ||
          finalUrl.includes('/dashboard') ||
          finalUrl.includes('/hubs') ||
          !finalUrl.includes('/login');

        if (!isDashboard) {
          console.log('⚠️ 대시보드로 리다이렉트되지 않았습니다');
          console.log(`Expected path: ${hub.dashboardPath}`);
          console.log(`Actual URL: ${finalUrl}`);
          throw new Error('대시보드로 리다이렉트되지 않음');
        }

        // 6. UI 요소 확인
        const hasButton = await page.locator('button').count() > 0;
        const hasLink = await page.locator('a').count() > 0;
        const hasNav = await page.locator('nav').count() > 0;

        console.log(`UI 요소 확인:`);
        console.log(`  - Button: ${hasButton ? '✅' : '❌'}`);
        console.log(`  - Link: ${hasLink ? '✅' : '❌'}`);
        console.log(`  - Nav: ${hasNav ? '✅' : '❌'}`);

        // 7. 페이지 제목 확인
        const title = await page.title();
        console.log(`Page Title: "${title}"`);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, '04-dashboard-success.png'),
          fullPage: true
        });

        // 성공 판정
        console.log(`\n✅ ${hub.name} 개발 모드 로그인 성공!`);
        console.log(`${'='.repeat(60)}\n`);

        expect(isDashboard).toBe(true);
        expect(hasButton || hasLink).toBe(true);

      } catch (error: any) {
        console.error(`\n❌ ${hub.name} 테스트 실패: ${error.message}`);
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, '99-error.png'),
          fullPage: true
        });

        console.log(`\nConsole Errors (${consoleErrors.length}):`);
        consoleErrors.slice(0, 5).forEach(err => console.log(`  ${err}`));

        throw error;
      }
    });
  }
});
