import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// ES 모듈에서 __dirname 정의
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HUBS = [
  { name: 'HubManager', frontend: 3090, backend: 4090 },
  { name: 'SalesHub', frontend: 3010, backend: 4010 },
  { name: 'FinHub', frontend: 3020, backend: 4020 },
  { name: 'OnboardingHub', frontend: 3030, backend: 4030 },
];

test.describe('모든 허브 첫 화면 디버깅', () => {
  test.setTimeout(180000);

  for (const hub of HUBS) {
    test(`${hub.name} 첫 화면 디버깅`, async ({ page }) => {
      const SCREENSHOT_DIR = path.join(__dirname, `../test-results/debug-screenshots/${hub.name.toLowerCase()}`);

      if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
      }

      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔍 ${hub.name} 디버깅 시작...`);
      console.log(`${'='.repeat(60)}\n`);

      const failedRequests: string[] = [];
      const consoleErrors: string[] = [];

      page.on('requestfailed', request => {
        const msg = `❌ ${request.url()} - ${request.failure()?.errorText}`;
        failedRequests.push(msg);
        console.log(msg);
      });

      page.on('console', msg => {
        if (msg.type() === 'error') {
          const errorMsg = `❌ Console: ${msg.text()}`;
          consoleErrors.push(errorMsg);
          console.log(errorMsg);
        }
      });

      let retryCount = 0;
      const maxRetries = 3;
      let success = false;

      while (!success && retryCount < maxRetries) {
        retryCount++;
        console.log(`\n🔄 시도 ${retryCount}/${maxRetries}`);

        try {
          // 1. 백엔드 헬스체크
          console.log('\n📊 Step 1: 백엔드 헬스체크...');
          const backendUrl = `http://localhost:${hub.backend}/api/health`;
          const backendResponse = await page.goto(backendUrl);
          const backendStatus = backendResponse?.status();

          console.log(`Backend Status: ${backendStatus}`);
          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, `${retryCount}-01-backend-health.png`)
          });

          if (backendStatus !== 200) {
            throw new Error(`백엔드 응답 실패: ${backendStatus}`);
          }

          const healthData = await backendResponse?.json();
          console.log(`✅ Backend Health: ${JSON.stringify(healthData)}`);

          // 2. 프론트엔드 접속
          console.log('\n📊 Step 2: 프론트엔드 접속...');
          const frontendUrl = `http://localhost:${hub.frontend}`;

          const frontendResponse = await page.goto(frontendUrl, {
            waitUntil: 'networkidle',
            timeout: 60000
          });

          const frontendStatus = frontendResponse?.status();
          console.log(`Frontend Status: ${frontendStatus}`);

          await page.waitForTimeout(2000);
          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, `${retryCount}-02-frontend-loaded.png`),
            fullPage: true
          });

          if (!frontendResponse || frontendStatus >= 400) {
            throw new Error(`프론트엔드 응답 실패: ${frontendStatus}`);
          }

          // 3. 페이지 분석
          console.log('\n📊 Step 3: 페이지 콘텐츠 분석...');

          const title = await page.title();
          console.log(`Page Title: "${title}"`);

          // Next.js 에러 체크
          const hasNextError = await page.locator('text=Application error').count() > 0;
          const has404 = await page.locator('text=404').count() > 0;
          const has500 = await page.locator('text=500').count() > 0;

          if (hasNextError || has404 || has500) {
            console.log('⚠️ Next.js 에러 페이지 감지');
            await page.screenshot({
              path: path.join(SCREENSHOT_DIR, `${retryCount}-03-error-page.png`),
              fullPage: true
            });
            throw new Error('Next.js 에러 페이지 감지');
          }

          // UI 요소 체크
          const hasMain = await page.locator('main, [role="main"]').count() > 0;
          const hasNav = await page.locator('nav').count() > 0;
          const hasButton = await page.locator('button').count() > 0;
          const hasLink = await page.locator('a').count() > 0;

          console.log(`UI 요소 확인:`);
          console.log(`  - Main: ${hasMain ? '✅' : '❌'}`);
          console.log(`  - Nav: ${hasNav ? '✅' : '❌'}`);
          console.log(`  - Button: ${hasButton ? '✅' : '❌'}`);
          console.log(`  - Link: ${hasLink ? '✅' : '❌'}`);

          // 페이지 텍스트
          const bodyText = await page.locator('body').textContent();
          const textPreview = bodyText?.replace(/\s+/g, ' ').trim().substring(0, 200);
          console.log(`Body Text (200자): "${textPreview}"`);

          // 4. 성공 판정
          const currentUrl = page.url();
          console.log(`\n📍 Current URL: ${currentUrl}`);

          if (frontendStatus === 200 && (hasMain || hasNav || hasButton)) {
            console.log(`\n✅ ${hub.name} 첫 화면 로드 성공!`);
            await page.screenshot({
              path: path.join(SCREENSHOT_DIR, `${retryCount}-04-success.png`),
              fullPage: true
            });
            success = true;
          } else {
            throw new Error('UI 요소를 충분히 찾지 못함');
          }

        } catch (error: any) {
          console.error(`\n❌ 시도 ${retryCount} 실패: ${error.message}`);

          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, `${retryCount}-99-error.png`),
            fullPage: true
          });

          if (retryCount < maxRetries) {
            console.log(`⏳ ${3}초 후 재시도...`);
            await page.waitForTimeout(3000);
          }
        }
      }

      // 최종 리포트
      console.log(`\n${'='.repeat(60)}`);
      if (success) {
        console.log(`✅ ${hub.name} 테스트 통과`);
      } else {
        console.log(`❌ ${hub.name} 테스트 실패 (${maxRetries}회 시도)`);
        console.log(`\nFailed Requests: ${failedRequests.length}`);
        failedRequests.slice(0, 5).forEach(req => console.log(`  ${req}`));
        console.log(`\nConsole Errors: ${consoleErrors.length}`);
        consoleErrors.slice(0, 5).forEach(err => console.log(`  ${err}`));
      }
      console.log(`${'='.repeat(60)}\n`);

      expect(success).toBe(true);
    });
  }
});
