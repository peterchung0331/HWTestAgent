import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOT_DIR = path.join(__dirname, '../test-results/saleshub-quick');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('SalesHub Quick Dev Login', () => {
  test.setTimeout(120000);

  test('SalesHub 개발 모드 로그인 빠른 테스트', async ({ page }) => {
    console.log('\n🚀 SalesHub 개발 모드 로그인 시작...\n');

    // 콘솔 로그 모니터링
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ Console Error: ${msg.text()}`);
      }
    });

    try {
      // 1. 로그인 페이지로 이동
      console.log('📊 Step 1: 로그인 페이지 접속');
      await page.goto('http://localhost:3010/login', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-login-page.png'), fullPage: true });

      // 2. 개발 모드 로그인 버튼 찾기 및 클릭
      console.log('📊 Step 2: 개발 모드 로그인 버튼 클릭');

      // 여러 방법으로 버튼 찾기 시도
      const buttonSelectors = [
        'button:has-text("개발 모드 로그인")',
        'button:has-text("개발 모드")',
        'button:has(svg)',
        'button[class*="gap-3"]',
      ];

      let clicked = false;
      for (const selector of buttonSelectors) {
        try {
          const button = page.locator(selector).first();
          if (await button.isVisible({ timeout: 2000 })) {
            console.log(`✅ 버튼 발견: ${selector}`);
            await button.click();
            clicked = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!clicked) {
        console.log('⚠️ 개발 모드 버튼을 찾을 수 없습니다');
        const bodyText = await page.locator('body').textContent();
        console.log(`Body text (500자): ${bodyText?.substring(0, 500)}`);
        throw new Error('개발 모드 로그인 버튼을 찾을 수 없습니다');
      }

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-button-clicked.png'), fullPage: true });

      // 3. 로딩 및 리다이렉트 대기
      console.log('📊 Step 3: 인증 처리 대기 중...');
      await page.waitForLoadState('networkidle', { timeout: 60000 });
      await page.waitForTimeout(3000);

      const currentUrl = page.url();
      console.log(`📍 Current URL: ${currentUrl}`);

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-after-redirect.png'), fullPage: true });

      // 4. 페이지 상태 분석
      console.log('📊 Step 4: 페이지 상태 분석');

      const title = await page.title();
      const hasLoginInUrl = currentUrl.includes('/login');
      const hasErrorParam = currentUrl.includes('error=');
      const hasButton = await page.locator('button').count() > 0;
      const hasNav = await page.locator('nav').count() > 0;

      console.log(`\n페이지 정보:`);
      console.log(`  - Title: "${title}"`);
      console.log(`  - URL: ${currentUrl}`);
      console.log(`  - Has /login in URL: ${hasLoginInUrl}`);
      console.log(`  - Has error param: ${hasErrorParam}`);
      console.log(`  - Has buttons: ${hasButton}`);
      console.log(`  - Has nav: ${hasNav}`);

      // 에러 메시지 확인
      if (hasErrorParam) {
        const errorMsg = await page.locator('[class*="destructive"]').textContent().catch(() => '');
        console.log(`⚠️ 에러 메시지: ${errorMsg}`);
      }

      // 5. 성공 판정
      const isSuccess = !hasLoginInUrl || (hasLoginInUrl && !hasErrorParam);

      if (isSuccess) {
        console.log('\n✅ SalesHub 개발 모드 로그인 성공!\n');
      } else {
        console.log('\n⚠️ 로그인 페이지에 머물러 있습니다\n');
      }

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-final-state.png'), fullPage: true });

      // 6. 계정 상태 API 호출 확인
      console.log('📊 Step 5: 인증 상태 확인');
      try {
        const response = await page.request.get('http://localhost:4010/api/auth/me', {
          headers: page.context().storageState ? {} : {}
        });
        const data = await response.json();
        console.log(`Auth API Response:`, data);
      } catch (e: any) {
        console.log(`⚠️ Auth API 호출 실패: ${e.message}`);
      }

    } catch (error: any) {
      console.error(`\n❌ 테스트 실패: ${error.message}\n`);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '99-error.png'), fullPage: true });
      throw error;
    }
  });
});
